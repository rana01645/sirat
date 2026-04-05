// useVocabulary — browse, search, and track learned Quranic vocabulary words.

import { useState, useEffect, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import type { Word, AyahWithSurah } from '@/src/types/quran';

export interface VocabStats {
  totalWords: number;
  learnedCount: number;
  topCoveragePercent: number; // % of Quran covered by learned words
}

export function useVocabulary() {
  const { db } = useDatabaseContext();
  const [words, setWords] = useState<Word[]>([]);
  const [learnedIds, setLearnedIds] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<VocabStats>({ totalWords: 0, learnedCount: 0, topCoveragePercent: 0 });
  const [loading, setLoading] = useState(true);

  const loadWords = useCallback(async (filter?: { search?: string; onlyLearned?: boolean; limit?: number; offset?: number }) => {
    setLoading(true);
    try {
      const tableCheck = await db.getFirstAsync<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='words'"
      );
      if (!tableCheck || tableCheck.cnt === 0) {
        setWords([]);
        setLoading(false);
        return;
      }

      let query = 'SELECT * FROM words';
      const params: (string | number)[] = [];
      const conditions: string[] = [];

      if (filter?.search) {
        conditions.push('(arabic LIKE ? OR bengali LIKE ? OR root LIKE ?)');
        const term = `%${filter.search}%`;
        params.push(term, term, term);
      }

      if (filter?.onlyLearned) {
        conditions.push('id IN (SELECT word_id FROM learned_words)');
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY rank ASC';

      if (filter?.limit) {
        query += ` LIMIT ${filter.limit}`;
        if (filter.offset) {
          query += ` OFFSET ${filter.offset}`;
        }
      }

      const rows = await db.getAllAsync<Word>(query, ...params);
      // Append if offset > 0, otherwise replace
      if (filter?.offset && filter.offset > 0) {
        setWords(prev => [...prev, ...rows]);
      } else {
        setWords(rows);
      }
    } catch (err) {
      console.error('[Vocabulary] loadWords error:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const loadLearnedIds = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<{ word_id: number }>('SELECT word_id FROM learned_words');
      setLearnedIds(new Set(rows.map((r) => r.word_id)));
    } catch (err) {
      console.error('[Vocabulary] loadLearnedIds error:', err);
    }
  }, [db]);

  const loadStats = useCallback(async () => {
    try {
      const tableCheck = await db.getFirstAsync<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='words'"
      );
      if (!tableCheck || tableCheck.cnt === 0) return;

      const totalRow = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM words');
      const learnedRow = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM learned_words');
      const totalOcc = await db.getFirstAsync<{ total: number }>('SELECT SUM(frequency) as total FROM words');

      // Calculate coverage: sum of frequencies of learned words / total occurrences
      const learnedOcc = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(w.frequency), 0) as total FROM words w JOIN learned_words lw ON lw.word_id = w.id'
      );

      setStats({
        totalWords: totalRow?.cnt ?? 0,
        learnedCount: learnedRow?.cnt ?? 0,
        topCoveragePercent: totalOcc?.total ? ((learnedOcc?.total ?? 0) / totalOcc.total) * 100 : 0,
      });
    } catch (err) {
      console.error('[Vocabulary] loadStats error:', err);
    }
  }, [db]);

  // Load once on mount — not on every callback identity change
  useEffect(() => {
    loadWords({ limit: 800 });
    loadLearnedIds();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const markLearned = useCallback(async (wordId: number) => {
    try {
      await db.runAsync('INSERT OR IGNORE INTO learned_words (word_id) VALUES (?)', wordId);
      setLearnedIds((prev) => new Set(prev).add(wordId));
      await loadStats();
    } catch (err) {
      console.error('[Vocabulary] markLearned error:', err);
    }
  }, [db, loadStats]);

  const unmarkLearned = useCallback(async (wordId: number) => {
    try {
      await db.runAsync('DELETE FROM learned_words WHERE word_id = ?', wordId);
      setLearnedIds((prev) => {
        const next = new Set(prev);
        next.delete(wordId);
        return next;
      });
      await loadStats();
    } catch (err) {
      console.error('[Vocabulary] unmarkLearned error:', err);
    }
  }, [db, loadStats]);

  const isLearned = useCallback((wordId: number) => learnedIds.has(wordId), [learnedIds]);

  const getAyahsForWord = useCallback(async (wordId: number): Promise<AyahWithSurah[]> => {
    try {
      const rows = await db.getAllAsync<AyahWithSurah>(
        `SELECT a.*, s.name_arabic as surah_name_arabic, s.name_bengali as surah_name_bengali
         FROM word_occurrences wo
         JOIN ayahs a ON a.id = wo.ayah_id
         JOIN surahs s ON s.id = a.surah_id
         WHERE wo.word_id = ?
         GROUP BY a.id
         ORDER BY a.id`,
        wordId
      );
      return rows;
    } catch (err) {
      console.error('[Vocabulary] getAyahsForWord error:', err);
      return [];
    }
  }, [db]);

  const getWordDetail = useCallback(async (wordId: number): Promise<Word | null> => {
    try {
      const row = await db.getFirstAsync<Word>('SELECT * FROM words WHERE id = ?', wordId);
      return row ?? null;
    } catch (err) {
      console.error('[Vocabulary] getWordDetail error:', err);
      return null;
    }
  }, [db]);

  const reload = useCallback(() => {
    loadWords({ limit: 800 });
    loadLearnedIds();
    loadStats();
  }, [loadWords, loadLearnedIds, loadStats]);

  return {
    words,
    learnedIds,
    stats,
    loading,
    loadWords,
    markLearned,
    unmarkLearned,
    isLearned,
    getAyahsForWord,
    getWordDetail,
    reload,
  };
}
