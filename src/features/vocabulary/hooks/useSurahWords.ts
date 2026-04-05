// useSurahWords — loads word-by-word data for all ayahs of a surah.
// Returns a Map<ayahId, WordInAyah[]> for efficient lookup.

import { useState, useEffect, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import type { WordInAyah } from '@/src/types/quran';

export function useSurahWords(surahId: number) {
  const { db } = useDatabaseContext();
  const [wordsMap, setWordsMap] = useState<Map<number, WordInAyah[]>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const rows = await db.getAllAsync<{
          word_id: number;
          ayah_id: number;
          arabic: string;
          bengali: string;
          root: string | null;
          position: number;
        }>(
          `SELECT w.id as word_id, wo.ayah_id, w.arabic, w.bengali, w.root, wo.position
           FROM word_occurrences wo
           JOIN words w ON w.id = wo.word_id
           JOIN ayahs a ON a.id = wo.ayah_id
           WHERE a.surah_id = ?
           ORDER BY wo.ayah_id, wo.position`,
          surahId
        );

        if (cancelled) return;

        const map = new Map<number, WordInAyah[]>();
        for (const r of rows) {
          if (!map.has(r.ayah_id)) {
            map.set(r.ayah_id, []);
          }
          map.get(r.ayah_id)!.push({
            wordId: r.word_id,
            arabic: r.arabic,
            bengali: r.bengali,
            root: r.root,
            position: r.position,
          });
        }

        setWordsMap(map);
      } catch (err) {
        console.error('[SurahWords] error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [db, surahId]);

  return { wordsMap, loading };
}
