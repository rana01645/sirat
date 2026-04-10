// Hook to track reading progress in SQLite.
// Records each ayah read to reading_history, saves last position to user_progress.
// Provides Quran completion stats.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { useUserStore } from '@/src/shared/stores/userStore';

export interface ReadingStats {
  totalUniqueAyahsRead: number;
  totalAyahs: number;
  completionPercent: number;
  lastSurahId: number;
  lastSurahName: string;
  lastAyahNumber: number;
  surahProgress: SurahProgress[];
}

export interface SurahProgress {
  surahId: number;
  nameArabic: string;
  nameBengali: string;
  versesCount: number;
  versesRead: number;
  percent: number;
  lastReadDate: string | null;
}

const TOTAL_AYAHS = 6236;

export function useReadingProgress() {
  const { db } = useDatabaseContext();
  const syncVersion = useUserStore((s) => s.syncVersion);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingWrites = useRef<Array<{ ayahId: number; surahId: number; verseNumber: number }>>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      // Total unique ayahs read
      const countRow = await db.getFirstAsync<{ c: number }>(
        'SELECT COUNT(DISTINCT ayah_id) as c FROM reading_history'
      );
      const totalRead = countRow?.c ?? 0;

      // Last read position
      const lastRow = await db.getFirstAsync<{
        surah_id: number;
        verse_number: number;
        name_bengali: string;
      }>(
        `SELECT rh.surah_id, rh.verse_number, s.name_bengali
         FROM reading_history rh
         JOIN surahs s ON s.id = rh.surah_id
         ORDER BY rh.id DESC LIMIT 1`
      );

      // Per-surah progress
      const surahRows = await db.getAllAsync<{
        surah_id: number;
        name_arabic: string;
        name_bengali: string;
        verses_count: number;
        verses_read: number;
        last_date: string | null;
      }>(
        `SELECT s.id as surah_id, s.name_arabic, s.name_bengali, s.verses_count,
                COUNT(DISTINCT rh.ayah_id) as verses_read,
                MAX(rh.read_date) as last_date
         FROM surahs s
         LEFT JOIN reading_history rh ON rh.surah_id = s.id
         GROUP BY s.id
         HAVING verses_read > 0
         ORDER BY MAX(rh.id) DESC`
      );

      setStats({
        totalUniqueAyahsRead: totalRead,
        totalAyahs: TOTAL_AYAHS,
        completionPercent: totalRead / TOTAL_AYAHS,
        lastSurahId: lastRow?.surah_id ?? 1,
        lastSurahName: lastRow?.name_bengali ?? '',
        lastAyahNumber: lastRow?.verse_number ?? 1,
        surahProgress: surahRows.map((r) => ({
          surahId: r.surah_id,
          nameArabic: r.name_arabic,
          nameBengali: r.name_bengali,
          versesCount: r.verses_count,
          versesRead: r.verses_read,
          percent: r.verses_read / r.verses_count,
          lastReadDate: r.last_date,
        })),
      });
    } catch (err) {
      console.error('[ReadingProgress] loadStats error:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadStats();
  }, [loadStats, syncVersion]);

  // Batch-write read ayahs (debounced to reduce DB writes)
  const flushPending = useCallback(async () => {
    if (pendingWrites.current.length === 0) return;
    const batch = [...pendingWrites.current];
    pendingWrites.current = [];

    const today = new Date().toISOString().split('T')[0];
    try {
      for (const { ayahId, surahId, verseNumber } of batch) {
        await db.runAsync(
          `INSERT OR IGNORE INTO reading_history (ayah_id, surah_id, verse_number, read_date) VALUES (?, ?, ?, ?)`,
          ayahId, surahId, verseNumber, today
        );
      }
      // Update last position
      const last = batch[batch.length - 1];
      await db.runAsync(
        `UPDATE user_progress SET current_surah_id = ?, current_ayah_id = ?, updated_at = datetime('now') WHERE id = 1`,
        last.surahId, last.ayahId
      );
    } catch (err) {
      console.error('[ReadingProgress] flush error:', err);
    }
  }, [db]);

  const recordAyahRead = useCallback((ayahId: number, surahId: number, verseNumber: number) => {
    pendingWrites.current.push({ ayahId, surahId, verseNumber });
    // Debounce: flush every 2 seconds
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      flushPending();
    }, 2000);
  }, [flushPending]);

  // Flush on unmount
  const flush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushPending();
  }, [flushPending]);

  return { stats, loading, recordAyahRead, flush, reload: loadStats };
}
