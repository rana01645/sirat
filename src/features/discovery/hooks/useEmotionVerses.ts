// Hook to fetch ayah data for emotion-based discovery verses.
// Queries ayah_emotions table for tagged verses, picks random selection.

import { useState, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import type { Emotion } from '../constants/emotion-verses';

export interface DiscoveryAyah {
  verseKey: string;
  textArabic: string;
  textBengali: string;
  contextBn: string;
  surahName: string;
}

const VERSES_PER_SESSION = 7;

export function useEmotionVerses() {
  const { db } = useDatabaseContext();
  const [verses, setVerses] = useState<DiscoveryAyah[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);

  const loadVerses = useCallback(async (emotion: Emotion) => {
    setLoading(true);
    setSelectedEmotion(emotion);

    try {
      // Pull random verses tagged with this emotion, weighted by relevance
      const rows = await db.getAllAsync<{
        text_uthmani: string;
        text_bengali: string;
        name_bengali: string;
        surah_id: number;
        verse_number: number;
      }>(
        `SELECT a.text_uthmani, a.text_bengali, a.surah_id, a.verse_number, s.name_bengali
         FROM ayah_emotions ae
         JOIN ayahs a ON a.id = ae.ayah_id
         JOIN surahs s ON s.id = a.surah_id
         WHERE ae.emotion = ?
         ORDER BY RANDOM()
         LIMIT ?`,
        [emotion.id, VERSES_PER_SESSION]
      );

      const results: DiscoveryAyah[] = rows.map((row) => ({
        verseKey: `${row.surah_id}:${row.verse_number}`,
        textArabic: row.text_uthmani,
        textBengali: row.text_bengali,
        contextBn: `সূরা ${row.name_bengali} — আয়াত ${row.verse_number}`,
        surahName: row.name_bengali,
      }));

      setVerses(results);
    } catch (err) {
      console.error('[Discovery] Failed to load verses:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const clear = useCallback(() => {
    setSelectedEmotion(null);
    setVerses([]);
  }, []);

  return { verses, loading, selectedEmotion, loadVerses, clear };
}
