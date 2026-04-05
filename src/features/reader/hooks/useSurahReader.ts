// src/features/reader/hooks/useSurahReader.ts
// Business logic hook for reading Surah data from SQLite.
// Keeps all DB queries out of UI components.

import { useCallback, useEffect, useState } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import type { Ayah, Surah, Tafsir } from '@/src/types/quran';

interface SurahReaderState {
  surah: Surah | null;
  ayahs: Ayah[];
  tafsirs: Map<string, string>;
  isLoading: boolean;
  error: Error | null;
}

export function useSurahReader(surahId: number) {
  const { db } = useDatabaseContext();
  const [state, setState] = useState<SurahReaderState>({
    surah: null,
    ayahs: [],
    tafsirs: new Map(),
    isLoading: true,
    error: null,
  });

  const loadSurah = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const surah = await db.getFirstAsync<Surah>(
        'SELECT id, name_arabic, name_bengali, revelation_place, verses_count FROM surahs WHERE id = ?',
        surahId
      );

      const ayahs = await db.getAllAsync<Ayah>(
        'SELECT id, surah_id, verse_number, text_uthmani, text_bengali FROM ayahs WHERE surah_id = ? ORDER BY verse_number ASC',
        surahId
      );

      // Load tafsirs for this surah, keyed by verse_key for quick lookup
      const tafsirRows = await db.getAllAsync<Tafsir>(
        'SELECT verse_key, text_bengali FROM tafsirs WHERE surah_id = ? ORDER BY verse_number ASC',
        surahId
      );

      const tafsirMap = new Map<string, string>();
      for (const row of tafsirRows) {
        tafsirMap.set(row.verse_key, row.text_bengali);
      }

      setState({ surah, ayahs, tafsirs: tafsirMap, isLoading: false, error: null });
    } catch (error) {
      setState({
        surah: null,
        ayahs: [],
        tafsirs: new Map(),
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [db, surahId]);

  useEffect(() => {
    loadSurah();
  }, [loadSurah]);

  return { ...state, reload: loadSurah };
}

/** Fetches all 114 surahs for a surah list/picker */
export function useSurahList() {
  const { db } = useDatabaseContext();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const results = await db.getAllAsync<Surah>(
          'SELECT id, name_arabic, name_bengali, revelation_place, verses_count FROM surahs ORDER BY id ASC'
        );
        setSurahs(results);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [db]);

  return { surahs, isLoading };
}
