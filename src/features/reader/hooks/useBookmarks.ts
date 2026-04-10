// Hook for ayah bookmarking — toggle, check, and list bookmarked ayahs.

import { useState, useEffect, useCallback } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { useUserStore } from '@/src/shared/stores/userStore';

export interface BookmarkedAyah {
  id: number;
  ayahId: number;
  surahId: number;
  verseNumber: number;
  surahNameBengali: string;
  surahNameArabic: string;
  textArabic: string;
  textBengali: string;
  createdAt: string;
}

export function useBookmarks() {
  const { db } = useDatabaseContext();
  const syncVersion = useUserStore((s) => s.syncVersion);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [bookmarks, setBookmarks] = useState<BookmarkedAyah[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
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
        created_at: string;
      }>(
        `SELECT b.id, b.ayah_id, a.surah_id, a.verse_number,
                s.name_bengali, s.name_arabic, a.text_uthmani, a.text_bengali,
                b.created_at
         FROM bookmarks b
         JOIN ayahs a ON a.id = b.ayah_id
         JOIN surahs s ON s.id = a.surah_id
         ORDER BY b.created_at DESC`
      );

      setBookmarks(rows.map((r) => ({
        id: r.id,
        ayahId: r.ayah_id,
        surahId: r.surah_id,
        verseNumber: r.verse_number,
        surahNameBengali: r.name_bengali,
        surahNameArabic: r.name_arabic,
        textArabic: r.text_uthmani,
        textBengali: r.text_bengali,
        createdAt: r.created_at,
      })));

      setBookmarkedIds(new Set(rows.map((r) => r.ayah_id)));
    } catch (err) {
      console.error('[Bookmarks] loadBookmarks error:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks, syncVersion]);

  const toggleBookmark = useCallback(async (ayahId: number) => {
    const isBookmarked = bookmarkedIds.has(ayahId);

    if (isBookmarked) {
      await db.runAsync('DELETE FROM bookmarks WHERE ayah_id = ?', ayahId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(ayahId);
        return next;
      });
      setBookmarks((prev) => prev.filter((b) => b.ayahId !== ayahId));
    } else {
      await db.runAsync('INSERT INTO bookmarks (ayah_id) VALUES (?)', ayahId);
      // Reload to get full joined data for the new bookmark
      await loadBookmarks();
    }
  }, [db, bookmarkedIds, loadBookmarks]);

  const isBookmarked = useCallback((ayahId: number) => {
    return bookmarkedIds.has(ayahId);
  }, [bookmarkedIds]);

  const removeBookmark = useCallback(async (id: number) => {
    await db.runAsync('DELETE FROM bookmarks WHERE id = ?', id);
    setBookmarks((prev) => {
      const entry = prev.find((b) => b.id === id);
      if (entry) {
        setBookmarkedIds((ids) => {
          const next = new Set(ids);
          next.delete(entry.ayahId);
          return next;
        });
      }
      return prev.filter((b) => b.id !== id);
    });
  }, [db]);

  return { bookmarks, bookmarkedIds, loading, isBookmarked, toggleBookmark, removeBookmark, reload: loadBookmarks };
}
