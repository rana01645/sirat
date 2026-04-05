// src/features/reader/hooks/useDatabaseSeeder.ts
// Seeds the SQLite database with Quranic data on first launch.
// Uses Asset system to avoid bundling 4MB+ JSON into the JS bundle.
// Single transaction with parameterized queries for safety and performance.

import { useCallback, useState } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import type * as SQLite from 'expo-sqlite';
import type {
  RawSurahsResponse,
  RawAyahsResponse,
  RawTranslationsResponse,
} from '@/src/types/quran';

interface SeederState {
  isSeeding: boolean;
  isSeeded: boolean;
  error: Error | null;
}

/**
 * Load a JSON asset at runtime (not bundled into JS).
 */
async function loadJsonAsset<T>(module: number): Promise<T> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error('Failed to download asset');
  }

  const content = await FileSystem.readAsStringAsync(asset.localUri);
  return JSON.parse(content) as T;
}

/**
 * Check if the database already has all 114 surahs seeded.
 */
async function isDatabaseSeeded(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM surahs'
  );
  return result !== null && result.count === 114;
}

/**
 * Master seeding function — checks if DB is empty, then seeds in a single transaction.
 */
export async function seedDatabaseIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const alreadySeeded = await isDatabaseSeeded(db);

  if (alreadySeeded) {
    console.log('[Seeder] Database already seeded — skipping');
    return;
  }

  console.log('[Seeder] First launch detected — loading Quran data...');
  const startTime = Date.now();

  try {
    // Load JSON assets at runtime (not bundled into JS)
    const [surahsData, ayahsData, translationsData] = await Promise.all([
      loadJsonAsset<RawSurahsResponse>(require('@/assets/data/surahs.json')),
      loadJsonAsset<RawAyahsResponse>(require('@/assets/data/ayahs.json')),
      loadJsonAsset<RawTranslationsResponse>(require('@/assets/data/translations_bn.json')),
    ]);

    const chapters = surahsData.chapters;
    const verses = ayahsData.verses;
    const translations = translationsData.translations;

    if (verses.length !== translations.length) {
      throw new Error(
        `Data mismatch: ${verses.length} ayahs vs ${translations.length} translations`
      );
    }

    console.log('[Seeder] Data loaded, inserting into SQLite...');

    await db.withTransactionAsync(async () => {
      // Seed surahs
      for (const ch of chapters) {
        await db.runAsync(
          'INSERT OR IGNORE INTO surahs (id, name_arabic, name_bengali, revelation_place, verses_count) VALUES (?, ?, ?, ?, ?)',
          ch.id,
          ch.name_arabic,
          ch.translated_name.name,
          ch.revelation_place,
          ch.verses_count
        );
      }
      console.log(`[Seeder] Inserted ${chapters.length} surahs`);

      // Seed ayahs with flattened Bengali translation
      for (let i = 0; i < verses.length; i++) {
        const verse = verses[i];
        const translation = translations[i];

        const [surahIdStr, verseNumStr] = verse.verse_key.split(':');
        const surahId = parseInt(surahIdStr, 10);
        const verseNumber = parseInt(verseNumStr, 10);

        await db.runAsync(
          'INSERT OR IGNORE INTO ayahs (id, surah_id, verse_number, text_uthmani, text_bengali) VALUES (?, ?, ?, ?, ?)',
          verse.id,
          surahId,
          verseNumber,
          verse.text_uthmani,
          translation.text
        );
      }
      console.log(`[Seeder] Inserted ${verses.length} ayahs with Bengali translations`);
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Seeder] ✅ Seeding complete in ${elapsed}s`);
  } catch (error) {
    console.error('[Seeder] ❌ Seeding failed:', error);
    throw error;
  }
}

/**
 * React hook wrapping the seeder — exposes state for the splash screen.
 * Keeps seeding logic out of UI components.
 */
export function useDatabaseSeeder() {
  const [state, setState] = useState<SeederState>({
    isSeeding: false,
    isSeeded: false,
    error: null,
  });

  const seed = useCallback(async (db: SQLite.SQLiteDatabase) => {
    setState({ isSeeding: true, isSeeded: false, error: null });

    try {
      await seedDatabaseIfEmpty(db);
      setState({ isSeeding: false, isSeeded: true, error: null });
    } catch (error) {
      setState({
        isSeeding: false,
        isSeeded: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, []);

  return { ...state, seed };
}
