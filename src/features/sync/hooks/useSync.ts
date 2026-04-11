// src/features/sync/hooks/useSync.ts
// Cross-device sync via Supabase — pushes/pulls user progress as JSON snapshots.
// Lightweight: each user stores ~10KB of progress data.

import { useCallback, useRef } from 'react';
import { useAuth } from '@/src/shared/providers/AuthProvider';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { supabase } from '@/src/shared/lib/supabase';
import { useGamificationStore } from '@/src/shared/stores/gamificationStore';
import { useUserStore } from '@/src/shared/stores/userStore';

interface SyncSnapshot {
  // Gamification (from gamification_state table)
  ilm_coins: number;
  current_streak: number;
  longest_streak: number;
  total_ayahs_read: number;
  total_sessions: number;
  last_session_date: string | null;

  // User progress (from user_progress table)
  reading_level: string;
  daily_goal_ayahs: number;
  current_surah_id: number;
  current_ayah_id: number;

  // Learned words (array of word IDs)
  learned_word_ids: number[];

  // Bookmarks (array of ayah IDs)
  bookmark_ayah_ids: number[];

  // Journal entries
  journal_entries: {
    ayah_id: number;
    reflection_text: string;
    created_at: string;
  }[];

  // Reading history
  reading_history: {
    surah_id: number;
    ayah_id: number;
    read_date: string;
  }[];

  synced_at: string;
}

export function useSync() {
  const { user } = useAuth();
  const { db } = useDatabaseContext();
  const syncingRef = useRef(false);

  // Collect local state into a snapshot
  const collectSnapshot = useCallback(async (): Promise<SyncSnapshot | null> => {
    if (!db) return null;

    try {
      // Gamification state
      const gam = await db.getFirstAsync<{
        ilm_coins: number; current_streak: number; longest_streak: number;
        total_ayahs_read: number; total_sessions: number; last_session_date: string | null;
      }>('SELECT ilm_coins, current_streak, longest_streak, total_ayahs_read, total_sessions, last_session_date FROM gamification_state WHERE id = 1');

      // User progress
      const prog = await db.getFirstAsync<{
        reading_level: string; daily_goal_ayahs: number;
        current_surah_id: number; current_ayah_id: number;
      }>('SELECT reading_level, daily_goal_ayahs, current_surah_id, current_ayah_id FROM user_progress WHERE id = 1');

      // Learned words
      const learnedRows = await db.getAllAsync<{ word_id: number }>('SELECT word_id FROM learned_words');

      // Bookmarks
      const bookmarkRows = await db.getAllAsync<{ ayah_id: number }>('SELECT ayah_id FROM bookmarks');

      // Journal entries
      const journalRows = await db.getAllAsync<{
        ayah_id: number; reflection_text: string; created_at: string;
      }>('SELECT ayah_id, reflection_text, created_at FROM journal_entries ORDER BY created_at');

      // Reading history (last 500 to keep snapshot small)
      const historyRows = await db.getAllAsync<{
        surah_id: number; ayah_id: number; read_date: string;
      }>('SELECT surah_id, ayah_id, read_date FROM reading_history ORDER BY read_date DESC LIMIT 500');

      return {
        ilm_coins: gam?.ilm_coins ?? 0,
        current_streak: gam?.current_streak ?? 0,
        longest_streak: gam?.longest_streak ?? 0,
        total_ayahs_read: gam?.total_ayahs_read ?? 0,
        total_sessions: gam?.total_sessions ?? 0,
        last_session_date: gam?.last_session_date ?? null,
        reading_level: prog?.reading_level ?? 'beginner',
        daily_goal_ayahs: prog?.daily_goal_ayahs ?? 3,
        current_surah_id: prog?.current_surah_id ?? 1,
        current_ayah_id: prog?.current_ayah_id ?? 1,
        learned_word_ids: learnedRows.map((r) => r.word_id),
        bookmark_ayah_ids: bookmarkRows.map((r) => r.ayah_id),
        journal_entries: journalRows,
        reading_history: historyRows,
        synced_at: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[Sync] collectSnapshot error:', err);
      return null;
    }
  }, [db]);

  // Apply a remote snapshot to local DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applySnapshot = useCallback(async (snap: Record<string, any>) => {
    if (!db) return;

    try {
      // Handle both old and new field names for backward compatibility
      const s = {
        ilm_coins: snap.ilm_coins ?? 0,
        current_streak: snap.current_streak ?? 0,
        longest_streak: snap.longest_streak ?? 0,
        total_ayahs_read: snap.total_ayahs_read ?? 0,
        total_sessions: snap.total_sessions ?? 0,
        last_session_date: snap.last_session_date ?? null,
        reading_level: snap.reading_level ?? 'beginner',
        daily_goal_ayahs: snap.daily_goal_ayahs ?? snap.daily_goal_value ?? 3,
        current_surah_id: snap.current_surah_id ?? snap.last_surah_id ?? 1,
        current_ayah_id: snap.current_ayah_id ?? snap.last_ayah_id ?? 1,
        learned_word_ids: snap.learned_word_ids ?? [],
        bookmark_ayah_ids: snap.bookmark_ayah_ids ?? [],
        journal_entries: snap.journal_entries ?? [],
        reading_history: snap.reading_history ?? [],
      };

      await db.withTransactionAsync(async () => {
        // Update gamification state
        await db.runAsync(
          `UPDATE gamification_state SET
            ilm_coins = ?, current_streak = ?, longest_streak = ?,
            total_ayahs_read = ?, total_sessions = ?, last_session_date = ?
           WHERE id = 1`,
          s.ilm_coins, s.current_streak, s.longest_streak,
          s.total_ayahs_read, s.total_sessions, s.last_session_date,
        );

        // Update user progress
        await db.runAsync(
          `UPDATE user_progress SET
            reading_level = ?, daily_goal_ayahs = ?,
            current_surah_id = ?, current_ayah_id = ?
           WHERE id = 1`,
          s.reading_level, s.daily_goal_ayahs,
          s.current_surah_id, s.current_ayah_id,
        );

        // Merge learned words (add new, keep existing)
        for (const wordId of s.learned_word_ids) {
          await db.runAsync(
            'INSERT OR IGNORE INTO learned_words (word_id) VALUES (?)',
            wordId,
          );
        }

        // Merge bookmarks
        for (const ayahId of s.bookmark_ayah_ids) {
          await db.runAsync(
            'INSERT OR IGNORE INTO bookmarks (ayah_id) VALUES (?)',
            ayahId,
          );
        }

        // Merge journal entries (by ayah_id + created_at to avoid duplicates)
        for (const entry of s.journal_entries) {
          const existing = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM journal_entries WHERE ayah_id = ? AND created_at = ?',
            entry.ayah_id, entry.created_at,
          );
          if (!existing) {
            await db.runAsync(
              'INSERT INTO journal_entries (ayah_id, reflection_text, created_at) VALUES (?, ?, ?)',
              entry.ayah_id, entry.reflection_text, entry.created_at,
            );
          }
        }

        // Merge reading history
        for (const h of s.reading_history) {
          await db.runAsync(
            'INSERT OR IGNORE INTO reading_history (surah_id, ayah_id, read_date) VALUES (?, ?, ?)',
            h.surah_id, h.ayah_id, h.read_date,
          );
        }
      });

      console.log('[Sync] Snapshot applied successfully');

      // Hydrate Zustand stores so UI updates immediately
      useGamificationStore.getState().hydrate({
        ilmCoins: s.ilm_coins,
        currentStreak: s.current_streak,
        longestStreak: s.longest_streak,
        totalAyahsRead: s.total_ayahs_read,
        totalSessions: s.total_sessions,
        lastSessionDate: s.last_session_date,
        dailyGoalAyahs: s.daily_goal_ayahs,
      });

      useUserStore.getState().hydrate({
        readingLevel: s.reading_level as 'beginner' | 'intermediate' | 'advanced',
        lastSurahId: s.current_surah_id,
        lastAyahId: s.current_ayah_id,
      });

      // Bump sync version so hooks like useVocabulary reload from DB
      useUserStore.getState().bumpSyncVersion();
    } catch (err) {
      console.error('[Sync] applySnapshot error:', err);
    }
  }, [db]);

  // Push local state to Supabase
  const pushSync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'লগইন করুন' };
    if (!db) return { success: false, error: 'ডাটাবেস লোড হয়নি' };
    if (syncingRef.current) return { success: false, error: 'সিঙ্ক চলছে...' };
    syncingRef.current = true;

    try {
      const snapshot = await collectSnapshot();
      if (!snapshot) return { success: false, error: 'ডাটা সংগ্রহ করতে ব্যর্থ' };

      console.log('[Sync] Pushing snapshot, user:', user.id, 'learned_words:', snapshot.learned_word_ids.length, 'ayahs_read:', snapshot.total_ayahs_read);

      const { error } = await supabase
        .from('user_sync')
        .upsert({
          user_id: user.id,
          snapshot: snapshot,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('[Sync] Push error:', error.message, error.code, error.details);
        return { success: false, error: error.message };
      }

      console.log('[Sync] Pushed to cloud successfully');
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Sync] Push failed:', msg);
      return { success: false, error: msg };
    } finally {
      syncingRef.current = false;
    }
  }, [user, db, collectSnapshot]);

  // Pull remote state and merge into local
  const pullSync = useCallback(async (): Promise<boolean> => {
    if (!user || !db || syncingRef.current) return false;
    syncingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('user_sync')
        .select('snapshot, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No remote data yet — push current local state
          console.log('[Sync] No remote data, pushing local state');
          syncingRef.current = false;
          await pushSync();
          return true;
        }
        console.error('[Sync] Pull error:', error.message);
        return false;
      }

      if (data?.snapshot) {
        await applySnapshot(data.snapshot as Record<string, unknown>);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Sync] Pull failed:', err);
      return false;
    } finally {
      syncingRef.current = false;
    }
  }, [user, db, applySnapshot, pushSync]);

  return {
    pushSync,
    pullSync,
    isAuthenticated: !!user,
  };
}
