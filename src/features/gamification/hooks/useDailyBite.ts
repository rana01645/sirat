// src/features/gamification/hooks/useDailyBite.ts
// Calculates today's verses based on reading progress.
// Serves exactly N ayahs (default 3) from where the user left off.

import { useState, useEffect, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { useGamificationStore } from '@/src/shared/stores/gamificationStore';
import type { Ayah, Surah } from '@/src/types/quran';

interface DailyBite {
  surah: Surah | null;
  ayahs: Ayah[];
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-goalTarget
  goalTarget: number;
  isComplete: boolean;
  startReading: () => void;
}

interface ProgressRow {
  current_surah_id: number;
  current_ayah_id: number;
}

export function useDailyBite(): DailyBite {
  const { db } = useDatabaseContext();
  const dailyProgress = useGamificationStore((s) => s.dailyProgress);
  const dailyGoalAyahs = useGamificationStore((s) => s.dailyGoalAyahs);
  const [surah, setSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDailyBite = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get current reading position
      const progress = await db.getFirstAsync<ProgressRow>(
        'SELECT current_surah_id, current_ayah_id FROM user_progress WHERE id = 1'
      );

      const startAyahId = progress?.current_ayah_id ?? 1;

      // Fetch next N ayahs from current position
      const rows = await db.getAllAsync<Ayah>(
        'SELECT * FROM ayahs WHERE id >= ? ORDER BY id ASC LIMIT ?',
        startAyahId,
        dailyGoalAyahs
      );

      if (rows.length > 0) {
        // Get surah info for the first ayah
        const surahRow = await db.getFirstAsync<Surah>(
          'SELECT * FROM surahs WHERE id = ?',
          rows[0].surah_id
        );
        setSurah(surahRow ?? null);
      }

      setAyahs(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load daily bite');
    } finally {
      setIsLoading(false);
    }
  }, [db, dailyGoalAyahs]);

  useEffect(() => {
    loadDailyBite();
  }, [loadDailyBite]);

  const startReading = useCallback(() => {
    // This will be called to navigate to the reader with today's verses
    // The actual navigation happens in the home screen component
  }, []);

  return {
    surah,
    ayahs,
    isLoading,
    error,
    progress: dailyProgress.ayahsRead,
    goalTarget: dailyGoalAyahs,
    isComplete: dailyProgress.goalCompleted,
    startReading,
  };
}
