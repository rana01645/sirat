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
  // Gamification
  ilm_coins: number;
  current_streak: number;
  longest_streak: number;
  total_ayahs_read: number;
  total_sessions: number;
  last_session_date: string | null;
  daily_goal_ayahs: number;
  unlocked_themes: string[];
  active_theme: string;

  // User progress
  reading_level: string;
  daily_goal_type: string;
  daily_goal_value: number;
  last_surah_id: number;
  last_ayah_id: number;

  // Learned words (array of word IDs)
  learned_word_ids: number[];

  // Bookmarks (array of ayah IDs)
  bookmark_ayah_ids: number[];

  // Journal entries
  journal_entries: {
    surah_id: number;
    verse_number: number;
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
        daily_goal_ayahs: number; unlocked_themes: string; active_theme: string;
      }>('SELECT * FROM gamification_state WHERE id = 1');

      // User progress
      const prog = await db.getFirstAsync<{
        reading_level: string; daily_goal_type: string; daily_goal_value: number;
        last_surah_id: number; last_ayah_id: number;
      }>('SELECT * FROM user_progress WHERE id = 1');

      // Learned words
      const learnedRows = await db.getAllAsync<{ word_id: number }>('SELECT word_id FROM learned_words');

      // Bookmarks
      const bookmarkRows = await db.getAllAsync<{ ayah_id: number }>('SELECT ayah_id FROM bookmarks');

      // Journal entries
      const journalRows = await db.getAllAsync<{
        surah_id: number; verse_number: number; reflection_text: string; created_at: string;
      }>('SELECT surah_id, verse_number, reflection_text, created_at FROM journal_entries ORDER BY created_at');

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
        daily_goal_ayahs: gam?.daily_goal_ayahs ?? 3,
        unlocked_themes: gam?.unlocked_themes ? JSON.parse(gam.unlocked_themes) : ['default'],
        active_theme: gam?.active_theme ?? 'default',
        reading_level: prog?.reading_level ?? 'beginner',
        daily_goal_type: prog?.daily_goal_type ?? 'ayahs',
        daily_goal_value: prog?.daily_goal_value ?? 3,
        last_surah_id: prog?.last_surah_id ?? 1,
        last_ayah_id: prog?.last_ayah_id ?? 1,
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
  const applySnapshot = useCallback(async (snap: SyncSnapshot) => {
    if (!db) return;

    try {
      await db.withTransactionAsync(async () => {
        // Update gamification
        await db.runAsync(
          `INSERT OR REPLACE INTO gamification_state (id, ilm_coins, current_streak, longest_streak, total_ayahs_read, total_sessions, last_session_date, daily_goal_ayahs, unlocked_themes, active_theme)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          snap.ilm_coins, snap.current_streak, snap.longest_streak,
          snap.total_ayahs_read, snap.total_sessions, snap.last_session_date,
          snap.daily_goal_ayahs, JSON.stringify(snap.unlocked_themes), snap.active_theme,
        );

        // Update user progress
        await db.runAsync(
          `INSERT OR REPLACE INTO user_progress (id, reading_level, daily_goal_type, daily_goal_value, last_surah_id, last_ayah_id)
           VALUES (1, ?, ?, ?, ?, ?)`,
          snap.reading_level, snap.daily_goal_type, snap.daily_goal_value,
          snap.last_surah_id, snap.last_ayah_id,
        );

        // Merge learned words (add new, keep existing)
        for (const wordId of snap.learned_word_ids) {
          await db.runAsync(
            'INSERT OR IGNORE INTO learned_words (word_id) VALUES (?)',
            wordId,
          );
        }

        // Merge bookmarks
        for (const ayahId of snap.bookmark_ayah_ids) {
          await db.runAsync(
            'INSERT OR IGNORE INTO bookmarks (ayah_id) VALUES (?)',
            ayahId,
          );
        }

        // Merge journal entries (by surah_id + verse_number + created_at to avoid duplicates)
        for (const entry of snap.journal_entries) {
          const existing = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM journal_entries WHERE surah_id = ? AND verse_number = ? AND created_at = ?',
            entry.surah_id, entry.verse_number, entry.created_at,
          );
          if (!existing) {
            await db.runAsync(
              'INSERT INTO journal_entries (surah_id, verse_number, reflection_text, created_at) VALUES (?, ?, ?, ?)',
              entry.surah_id, entry.verse_number, entry.reflection_text, entry.created_at,
            );
          }
        }

        // Merge reading history
        for (const h of snap.reading_history) {
          await db.runAsync(
            'INSERT OR IGNORE INTO reading_history (surah_id, ayah_id, read_date) VALUES (?, ?, ?)',
            h.surah_id, h.ayah_id, h.read_date,
          );
        }
      });

      console.log('[Sync] Snapshot applied successfully');

      // Hydrate Zustand stores so UI updates immediately
      useGamificationStore.getState().hydrate({
        ilmCoins: snap.ilm_coins,
        currentStreak: snap.current_streak,
        longestStreak: snap.longest_streak,
        totalAyahsRead: snap.total_ayahs_read,
        totalSessions: snap.total_sessions,
        lastSessionDate: snap.last_session_date,
        dailyGoalAyahs: snap.daily_goal_ayahs,
        unlockedThemes: snap.unlocked_themes,
        activeTheme: snap.active_theme,
      });

      useUserStore.getState().hydrate({
        readingLevel: snap.reading_level as 'beginner' | 'intermediate' | 'advanced',
        dailyGoalType: snap.daily_goal_type as 'ayahs' | 'minutes',
        dailyGoalValue: snap.daily_goal_value,
        lastSurahId: snap.last_surah_id,
        lastAyahId: snap.last_ayah_id,
      });
    } catch (err) {
      console.error('[Sync] applySnapshot error:', err);
    }
  }, [db]);

  // Push local state to Supabase
  const pushSync = useCallback(async () => {
    if (!user || !db || syncingRef.current) return;
    syncingRef.current = true;

    try {
      const snapshot = await collectSnapshot();
      if (!snapshot) return;

      const { error } = await supabase
        .from('user_sync')
        .upsert({
          user_id: user.id,
          snapshot: snapshot,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('[Sync] Push error:', error.message);
      } else {
        console.log('[Sync] Pushed to cloud');
      }
    } catch (err) {
      console.error('[Sync] Push failed:', err);
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
        await applySnapshot(data.snapshot as SyncSnapshot);
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
