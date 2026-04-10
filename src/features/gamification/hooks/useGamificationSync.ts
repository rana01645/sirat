// src/features/gamification/hooks/useGamificationSync.ts
// Hydrates gamification store from SQLite on mount, persists changes back.

import { useEffect, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { useGamificationStore } from '@/src/shared/stores/gamificationStore';
import { useUserStore } from '@/src/shared/stores/userStore';

interface GamificationRow {
  ilm_coins: number;
  current_streak: number;
  longest_streak: number;
  nur_level: number;
  total_ayahs_read: number;
  total_sessions: number;
  last_session_date: string | null;
}

interface DailyLogRow {
  ayahs_read: number;
  goal_target: number;
  goal_completed: number;
  coins_earned: number;
  tafsirs_read: number;
  notes_written: number;
}

interface ProgressRow {
  daily_goal_ayahs: number;
}

export function useGamificationSync() {
  const { db } = useDatabaseContext();
  const syncVersion = useUserStore((s) => s.syncVersion);
  const hydrate = useGamificationStore((s) => s.hydrate);
  const resetDailyIfNeeded = useGamificationStore((s) => s.resetDailyIfNeeded);
  const updateStreak = useGamificationStore((s) => s.updateStreak);

  // Hydrate from DB on mount
  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];

      // Load gamification state
      const gam = await db.getFirstAsync<GamificationRow>(
        'SELECT * FROM gamification_state WHERE id = 1'
      );

      // Load daily goal preference
      const prog = await db.getFirstAsync<ProgressRow>(
        'SELECT daily_goal_ayahs FROM user_progress WHERE id = 1'
      );

      // Load today's log if exists
      const todayLog = await db.getFirstAsync<DailyLogRow>(
        'SELECT * FROM daily_logs WHERE date = ?',
        today
      );

      if (gam) {
        hydrate({
          ilmCoins: gam.ilm_coins,
          currentStreak: gam.current_streak,
          longestStreak: gam.longest_streak,
          totalAyahsRead: gam.total_ayahs_read,
          totalSessions: gam.total_sessions,
          lastSessionDate: gam.last_session_date,
          dailyGoalAyahs: prog?.daily_goal_ayahs ?? 3,
        });
      }

      if (todayLog) {
        hydrate({
          dailyProgress: {
            date: today,
            ayahsRead: todayLog.ayahs_read,
            goalTarget: todayLog.goal_target,
            goalCompleted: todayLog.goal_completed === 1,
            coinsEarned: todayLog.coins_earned,
            tafsirsRead: todayLog.tafsirs_read,
            notesWritten: todayLog.notes_written,
          },
        });
      }

      // Check if streak is broken
      updateStreak(today);
      resetDailyIfNeeded(today);
    })();
  }, [db, syncVersion, hydrate, resetDailyIfNeeded, updateStreak]);

  // Persist to DB
  const persistState = useCallback(async () => {
    const state = useGamificationStore.getState();
    const today = new Date().toISOString().split('T')[0];

    await db.runAsync(
      `UPDATE gamification_state SET
        ilm_coins = ?, current_streak = ?, longest_streak = ?,
        nur_level = ?, total_ayahs_read = ?, total_sessions = ?,
        last_session_date = ?, updated_at = datetime('now')
      WHERE id = 1`,
      state.ilmCoins,
      state.currentStreak,
      state.longestStreak,
      state.nurLevel,
      state.totalAyahsRead,
      state.totalSessions,
      state.lastSessionDate
    );

    // Upsert daily log
    await db.runAsync(
      `INSERT INTO daily_logs (date, ayahs_read, goal_target, goal_completed, coins_earned, tafsirs_read, notes_written)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         ayahs_read = excluded.ayahs_read,
         goal_target = excluded.goal_target,
         goal_completed = excluded.goal_completed,
         coins_earned = excluded.coins_earned,
         tafsirs_read = excluded.tafsirs_read,
         notes_written = excluded.notes_written`,
      today,
      state.dailyProgress.ayahsRead,
      state.dailyProgress.goalTarget,
      state.dailyProgress.goalCompleted ? 1 : 0,
      state.dailyProgress.coinsEarned,
      state.dailyProgress.tafsirsRead,
      state.dailyProgress.notesWritten
    );
  }, [db]);

  return { persistState };
}
