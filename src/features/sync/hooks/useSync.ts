// src/features/sync/hooks/useSync.ts
// Cross-device sync via Supabase — pushes/pulls user progress as JSON snapshots.

import { useCallback, useRef } from 'react';
import { useAuth } from '@/src/shared/providers/AuthProvider';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { supabase } from '@/src/shared/lib/supabase';
import { useGamificationStore } from '@/src/shared/stores/gamificationStore';
import { useUserStore } from '@/src/shared/stores/userStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safe number with fallback */
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;

/** Safe string with fallback */
const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

/** Safe array with fallback */
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v : []);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSync() {
  const { user } = useAuth();
  const { db } = useDatabaseContext();
  const busyRef = useRef(false);

  // ── Collect local SQLite state into a plain JSON object ──────────────────

  const collectSnapshot = useCallback(async () => {
    if (!db) throw new Error('DB not ready');

    // gamification_state columns: ilm_coins, current_streak, longest_streak,
    //   total_ayahs_read, total_sessions, last_session_date
    const gam = await db.getFirstAsync<{
      ilm_coins: number;
      current_streak: number;
      longest_streak: number;
      total_ayahs_read: number;
      total_sessions: number;
      last_session_date: string | null;
    }>(
      `SELECT ilm_coins, current_streak, longest_streak,
              total_ayahs_read, total_sessions, last_session_date
       FROM gamification_state WHERE id = 1`,
    );

    // user_progress columns: current_surah_id, current_ayah_id,
    //   daily_goal_ayahs, reading_level, total_ayahs_read
    const prog = await db.getFirstAsync<{
      current_surah_id: number;
      current_ayah_id: number;
      daily_goal_ayahs: number;
      reading_level: string;
    }>(
      `SELECT current_surah_id, current_ayah_id, daily_goal_ayahs, reading_level
       FROM user_progress WHERE id = 1`,
    );

    // learned_words: word_id
    const learned = await db.getAllAsync<{ word_id: number }>(
      'SELECT word_id FROM learned_words',
    );

    // bookmarks: ayah_id
    const bookmarks = await db.getAllAsync<{ ayah_id: number }>(
      'SELECT ayah_id FROM bookmarks',
    );

    // journal_entries: ayah_id, reflection_text, created_at
    const journal = await db.getAllAsync<{
      ayah_id: number;
      reflection_text: string;
      created_at: string;
    }>('SELECT ayah_id, reflection_text, created_at FROM journal_entries ORDER BY created_at');

    // reading_history: surah_id, ayah_id, verse_number, read_date (last 500)
    const history = await db.getAllAsync<{
      surah_id: number;
      ayah_id: number;
      verse_number: number;
      read_date: string;
    }>('SELECT surah_id, ayah_id, verse_number, read_date FROM reading_history ORDER BY read_date DESC LIMIT 500');

    const snapshot = {
      // gamification
      ilm_coins: gam?.ilm_coins ?? 0,
      current_streak: gam?.current_streak ?? 0,
      longest_streak: gam?.longest_streak ?? 0,
      total_ayahs_read: gam?.total_ayahs_read ?? 0,
      total_sessions: gam?.total_sessions ?? 0,
      last_session_date: gam?.last_session_date ?? null,
      // user progress
      reading_level: prog?.reading_level ?? 'beginner',
      daily_goal_ayahs: prog?.daily_goal_ayahs ?? 3,
      current_surah_id: prog?.current_surah_id ?? 1,
      current_ayah_id: prog?.current_ayah_id ?? 1,
      // arrays
      learned_word_ids: learned.map((r) => r.word_id),
      bookmark_ayah_ids: bookmarks.map((r) => r.ayah_id),
      journal_entries: journal,
      reading_history: history,
      // metadata
      synced_at: new Date().toISOString(),
    };

    console.log(
      '[Sync] Snapshot collected:',
      'coins=', snapshot.ilm_coins,
      'streak=', snapshot.current_streak,
      'words=', snapshot.learned_word_ids.length,
      'bookmarks=', snapshot.bookmark_ayah_ids.length,
      'journal=', snapshot.journal_entries.length,
      'history=', snapshot.reading_history.length,
    );

    return snapshot;
  }, [db]);

  // ── Apply a remote snapshot to local SQLite (defensive parsing) ──────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applySnapshot = useCallback(async (raw: any) => {
    if (!db) throw new Error('DB not ready');

    // Normalize — handle both old and new field names
    const snap = {
      ilm_coins: num(raw.ilm_coins),
      current_streak: num(raw.current_streak),
      longest_streak: num(raw.longest_streak),
      total_ayahs_read: num(raw.total_ayahs_read),
      total_sessions: num(raw.total_sessions),
      last_session_date: raw.last_session_date ?? null,
      reading_level: str(raw.reading_level, 'beginner'),
      daily_goal_ayahs: num(raw.daily_goal_ayahs) || num(raw.daily_goal_value) || 3,
      current_surah_id: num(raw.current_surah_id) || num(raw.last_surah_id) || 1,
      current_ayah_id: num(raw.current_ayah_id) || num(raw.last_ayah_id) || 1,
      learned_word_ids: arr<number>(raw.learned_word_ids),
      bookmark_ayah_ids: arr<number>(raw.bookmark_ayah_ids),
      journal_entries: arr<{ ayah_id: number; reflection_text: string; created_at: string }>(raw.journal_entries),
      reading_history: arr<{ surah_id: number; ayah_id: number; verse_number: number; read_date: string }>(raw.reading_history),
    };

    console.log(
      '[Sync] Applying snapshot:',
      'coins=', snap.ilm_coins,
      'streak=', snap.current_streak,
      'words=', snap.learned_word_ids.length,
    );

    await db.withTransactionAsync(async () => {
      // gamification_state
      await db.runAsync(
        `UPDATE gamification_state SET
          ilm_coins = ?, current_streak = ?, longest_streak = ?,
          total_ayahs_read = ?, total_sessions = ?, last_session_date = ?
         WHERE id = 1`,
        [snap.ilm_coins, snap.current_streak, snap.longest_streak,
         snap.total_ayahs_read, snap.total_sessions, snap.last_session_date],
      );

      // user_progress
      await db.runAsync(
        `UPDATE user_progress SET
          reading_level = ?, daily_goal_ayahs = ?,
          current_surah_id = ?, current_ayah_id = ?
         WHERE id = 1`,
        [snap.reading_level, snap.daily_goal_ayahs,
         snap.current_surah_id, snap.current_ayah_id],
      );

      // learned_words — merge
      for (const wid of snap.learned_word_ids) {
        if (typeof wid === 'number') {
          await db.runAsync('INSERT OR IGNORE INTO learned_words (word_id) VALUES (?)', [wid]);
        }
      }

      // bookmarks — merge
      for (const aid of snap.bookmark_ayah_ids) {
        if (typeof aid === 'number') {
          await db.runAsync('INSERT OR IGNORE INTO bookmarks (ayah_id) VALUES (?)', [aid]);
        }
      }

      // journal_entries — merge by ayah_id + created_at
      for (const e of snap.journal_entries) {
        if (!e || typeof e.ayah_id !== 'number') continue;
        const exists = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM journal_entries WHERE ayah_id = ? AND created_at = ?',
          [e.ayah_id, e.created_at ?? ''],
        );
        if (!exists) {
          await db.runAsync(
            'INSERT INTO journal_entries (ayah_id, reflection_text, created_at) VALUES (?, ?, ?)',
            [e.ayah_id, e.reflection_text ?? '', e.created_at ?? new Date().toISOString()],
          );
        }
      }

      // reading_history — merge (includes verse_number which is NOT NULL)
      for (const h of snap.reading_history) {
        if (!h || typeof h.ayah_id !== 'number') continue;
        // Look up verse_number if not in snapshot (old snapshots lack it)
        let verseNum = h.verse_number;
        if (typeof verseNum !== 'number' || verseNum === 0) {
          const ayah = await db.getFirstAsync<{ verse_number: number }>(
            'SELECT verse_number FROM ayahs WHERE id = ?', [h.ayah_id],
          );
          verseNum = ayah?.verse_number ?? 0;
        }
        await db.runAsync(
          'INSERT OR IGNORE INTO reading_history (surah_id, ayah_id, verse_number, read_date) VALUES (?, ?, ?, ?)',
          [h.surah_id ?? 0, h.ayah_id, verseNum, h.read_date ?? ''],
        );
      }
    });

    console.log('[Sync] Snapshot applied to SQLite');

    // Hydrate Zustand stores
    useGamificationStore.getState().hydrate({
      ilmCoins: snap.ilm_coins,
      currentStreak: snap.current_streak,
      longestStreak: snap.longest_streak,
      totalAyahsRead: snap.total_ayahs_read,
      totalSessions: snap.total_sessions,
      lastSessionDate: snap.last_session_date,
      dailyGoalAyahs: snap.daily_goal_ayahs,
    });

    useUserStore.getState().hydrate({
      readingLevel: snap.reading_level as 'beginner' | 'intermediate' | 'advanced',
      lastSurahId: snap.current_surah_id,
      lastAyahId: snap.current_ayah_id,
    });

    // Trigger reload of all data hooks
    useUserStore.getState().bumpSyncVersion();

    console.log('[Sync] Zustand stores hydrated + syncVersion bumped');
  }, [db]);

  // ── Push to Supabase ────────────────────────────────────────────────────

  const pushSync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'লগইন করুন' };
    if (!db) return { success: false, error: 'ডাটাবেস লোড হয়নি' };
    if (busyRef.current) return { success: false, error: 'সিঙ্ক চলছে...' };
    busyRef.current = true;

    try {
      const snapshot = await collectSnapshot();

      const { error } = await supabase
        .from('user_sync')
        .upsert(
          { user_id: user.id, snapshot, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );

      if (error) {
        console.error('[Sync] Push API error:', error);
        return { success: false, error: error.message };
      }

      console.log('[Sync] Push success for user:', user.id);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Sync] Push exception:', msg);
      return { success: false, error: msg };
    } finally {
      busyRef.current = false;
    }
  }, [user, db, collectSnapshot]);

  // ── Pull from Supabase ──────────────────────────────────────────────────

  const pullSync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'লগইন করুন' };
    if (!db) return { success: false, error: 'ডাটাবেস লোড হয়নি' };
    if (busyRef.current) return { success: false, error: 'সিঙ্ক চলছে...' };
    busyRef.current = true;

    try {
      const { data, error } = await supabase
        .from('user_sync')
        .select('snapshot, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[Sync] No remote data — pushing local state');
          busyRef.current = false;
          return pushSync();
        }
        console.error('[Sync] Pull API error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.snapshot) {
        return { success: false, error: 'ক্লাউডে কোনো ডেটা নেই' };
      }

      console.log('[Sync] Pull got data, updated_at:', data.updated_at);
      await applySnapshot(data.snapshot);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Sync] Pull exception:', msg);
      return { success: false, error: msg };
    } finally {
      busyRef.current = false;
    }
  }, [user, db, applySnapshot, pushSync]);

  return { pushSync, pullSync, isAuthenticated: !!user };
}
