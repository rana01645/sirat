// Hook to fetch all journal entries with verse/surah context.

import { useState, useEffect, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { useUserStore } from '@/src/shared/stores/userStore';

export interface JournalEntry {
  id: number;
  ayahId: number;
  surahId: number;
  verseNumber: number;
  surahNameBengali: string;
  surahNameArabic: string;
  textArabic: string;
  textBengali: string;
  reflectionText: string;
  createdAt: string;
}

export function useJournal() {
  const { db } = useDatabaseContext();
  const syncVersion = useUserStore((s) => s.syncVersion);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await db.getAllAsync<{
        id: number;
        ayah_id: number;
        surah_id: number;
        verse_number: number;
        name_bengali: string;
        name_arabic: string;
        text_uthmani: string;
        text_bengali: string;
        reflection_text: string;
        created_at: string;
      }>(
        `SELECT j.id, j.ayah_id, a.surah_id, a.verse_number,
                s.name_bengali, s.name_arabic, a.text_uthmani, a.text_bengali,
                j.reflection_text, j.created_at
         FROM journal_entries j
         JOIN ayahs a ON a.id = j.ayah_id
         JOIN surahs s ON s.id = a.surah_id
         ORDER BY j.created_at DESC`
      );

      setEntries(rows.map((r) => ({
        id: r.id,
        ayahId: r.ayah_id,
        surahId: r.surah_id,
        verseNumber: r.verse_number,
        surahNameBengali: r.name_bengali,
        surahNameArabic: r.name_arabic,
        textArabic: r.text_uthmani,
        textBengali: r.text_bengali,
        reflectionText: r.reflection_text,
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error('[Journal] loadEntries error:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, syncVersion]);

  const deleteEntry = useCallback(async (id: number) => {
    await db.runAsync('DELETE FROM journal_entries WHERE id = ?', id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, [db]);

  return { entries, loading, reload: loadEntries, deleteEntry };
}
