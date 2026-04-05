// useWordLookup — returns word-by-word breakdown for a given ayah.

import { useState, useEffect, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import type { WordInAyah } from '@/src/types/quran';

export function useWordLookup(ayahId: number | null) {
  const { db } = useDatabaseContext();
  const [words, setWords] = useState<WordInAyah[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!ayahId) {
      setWords([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await db.getAllAsync<{
        word_id: number;
        arabic: string;
        bengali: string;
        root: string | null;
        position: number;
      }>(
        `SELECT w.id as word_id, w.arabic, w.bengali, w.root, wo.position
         FROM word_occurrences wo
         JOIN words w ON w.id = wo.word_id
         WHERE wo.ayah_id = ?
         ORDER BY wo.position`,
        ayahId
      );

      setWords(rows.map((r) => ({
        wordId: r.word_id,
        arabic: r.arabic,
        bengali: r.bengali,
        root: r.root,
        position: r.position,
      })));
    } catch (err) {
      console.error('[WordLookup] error:', err);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [db, ayahId]);

  useEffect(() => {
    load();
  }, [load]);

  return { words, loading };
}
