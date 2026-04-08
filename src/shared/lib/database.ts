// src/shared/lib/database.ts
// SQLite database initializer — offline-first engine
// Native: uses pre-built quran.db shipped as an asset.
// Web: uses sql.js (in-memory SQLite with IndexedDB persistence) — no OPFS needed.

import { Platform } from 'react-native';

const DB_NAME = 'quran_app.db';
const DB_VERSION = 2; // v2: added words + word_occurrences tables

// Unified database interface that works on both native (expo-sqlite) and web (sql.js)
export interface AppDatabase {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(callback: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

let db: AppDatabase | null = null;
let dbInitPromise: Promise<AppDatabase> | null = null;

// ── Native (iOS/Android) ───────────────────────────────────────────

async function initNativeDatabase(): Promise<AppDatabase> {
  const SQLite = await import('expo-sqlite');
  const { importDatabaseFromAssetAsync } = SQLite;

  let needsOverwrite = false;
  try {
    const checkDb = await SQLite.openDatabaseAsync(DB_NAME);
    const versionRow = await checkDb.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    const currentVersion = versionRow?.user_version ?? 0;
    if (currentVersion < DB_VERSION) {
      needsOverwrite = true;
    }
    await checkDb.closeAsync();
  } catch {
    needsOverwrite = false;
  }

  await importDatabaseFromAssetAsync(DB_NAME, {
    assetId: require('@/assets/data/quran.db'),
    forceOverwrite: needsOverwrite,
  });

  return SQLite.openDatabaseAsync(DB_NAME) as Promise<AppDatabase>;
}

// ── Web (sql.js + IndexedDB) ───────────────────────────────────────

async function initWebDatabase(): Promise<AppDatabase> {
  const { openWebDatabase } = await import('./web-database');
  const database = await openWebDatabase(DB_NAME);

  // Create all tables
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS surahs (
      id INTEGER PRIMARY KEY,
      name_arabic TEXT NOT NULL,
      name_bengali TEXT NOT NULL,
      revelation_place TEXT NOT NULL,
      verses_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ayahs (
      id INTEGER PRIMARY KEY,
      surah_id INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      text_uthmani TEXT NOT NULL,
      text_bengali TEXT NOT NULL,
      FOREIGN KEY (surah_id) REFERENCES surahs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_ayahs_surah ON ayahs(surah_id, verse_number);
    CREATE TABLE IF NOT EXISTS tafsirs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      verse_key TEXT NOT NULL,
      surah_id INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      text_bengali TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tafsirs_verse ON tafsirs(surah_id, verse_number);
    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_surah_id INTEGER NOT NULL DEFAULT 1,
      current_ayah_id INTEGER NOT NULL DEFAULT 1,
      daily_goal_ayahs INTEGER NOT NULL DEFAULT 3,
      reading_level TEXT NOT NULL DEFAULT 'beginner',
      total_ayahs_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ayah_id INTEGER NOT NULL,
      reflection_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
    );
    CREATE TABLE IF NOT EXISTS gamification_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ilm_coins INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      nur_level INTEGER NOT NULL DEFAULT 1,
      total_ayahs_read INTEGER NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 0,
      last_session_date TEXT,
      rank_id TEXT NOT NULL DEFAULT 'seeker'
    );
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      ayahs_read INTEGER NOT NULL DEFAULT 0,
      goal_target INTEGER NOT NULL DEFAULT 3,
      goal_completed INTEGER NOT NULL DEFAULT 0,
      coins_earned INTEGER NOT NULL DEFAULT 0,
      tafsirs_read INTEGER NOT NULL DEFAULT 0,
      notes_written INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ayah_id INTEGER NOT NULL,
      surah_id INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      read_date TEXT NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_reading_history_date ON reading_history(read_date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_history_unique ON reading_history(ayah_id, read_date);
    CREATE TABLE IF NOT EXISTS ayah_emotions (
      ayah_id INTEGER NOT NULL,
      emotion TEXT NOT NULL,
      relevance INTEGER DEFAULT 3,
      PRIMARY KEY (ayah_id, emotion)
    );
    CREATE INDEX IF NOT EXISTS idx_ayah_emotions_emotion ON ayah_emotions(emotion);
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY,
      arabic TEXT NOT NULL,
      root TEXT,
      bengali TEXT NOT NULL,
      english TEXT,
      frequency INTEGER NOT NULL DEFAULT 1,
      rank INTEGER
    );
    CREATE TABLE IF NOT EXISTS word_occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      ayah_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id),
      FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_words_arabic ON words(arabic);
    CREATE INDEX IF NOT EXISTS idx_words_rank ON words(rank);
    CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency DESC);
    CREATE INDEX IF NOT EXISTS idx_word_occ_word ON word_occurrences(word_id);
    CREATE INDEX IF NOT EXISTS idx_word_occ_ayah ON word_occurrences(ayah_id);
  `);

  // Check if already seeded
  const surahCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM surahs'
  );
  const wordCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM words'
  );
  if (surahCount && surahCount.count >= 114 && wordCount && wordCount.count > 0) {
    return database;
  }

  console.log('[Web Seeder] Seeding database from JSON...');

  const [surahsRes, ayahsRes, translationsRes] = await Promise.all([
    fetch('/assets/data/surahs.json').then(r => r.json()),
    fetch('/assets/data/ayahs.json').then(r => r.json()),
    fetch('/assets/data/translations_bn.json').then(r => r.json()),
  ]);

  const chapters = surahsRes.chapters;
  const verses = ayahsRes.verses;
  const translations = translationsRes.translations;

  await database.withTransactionAsync(async () => {
    for (const ch of chapters) {
      await database.runAsync(
        'INSERT OR IGNORE INTO surahs (id, name_arabic, name_bengali, revelation_place, verses_count) VALUES (?, ?, ?, ?, ?)',
        ch.id, ch.name_arabic, ch.translated_name.name, ch.revelation_place, ch.verses_count
      );
    }

    for (let i = 0; i < verses.length; i++) {
      const verse = verses[i];
      const translation = translations[i];
      const [surahIdStr, verseNumStr] = verse.verse_key.split(':');

      await database.runAsync(
        'INSERT OR IGNORE INTO ayahs (id, surah_id, verse_number, text_uthmani, text_bengali) VALUES (?, ?, ?, ?, ?)',
        verse.id, parseInt(surahIdStr, 10), parseInt(verseNumStr, 10),
        verse.text_uthmani, translation.text
      );
    }
  });

  // Seed tafsir
  try {
    const tafsirRes = await fetch('/assets/data/tafsir_bn.json').then(r => r.json());
    const tafsirs = tafsirRes.tafsirs || tafsirRes;
    if (Array.isArray(tafsirs) && tafsirs.length > 0) {
      await database.withTransactionAsync(async () => {
        for (const t of tafsirs) {
          const [sId, vN] = (t.verse_key || '').split(':');
          if (sId && vN) {
            await database.runAsync(
              'INSERT OR IGNORE INTO tafsirs (verse_key, surah_id, verse_number, text_bengali) VALUES (?, ?, ?, ?)',
              t.verse_key, parseInt(sId, 10), parseInt(vN, 10), t.text
            );
          }
        }
      });
    }
  } catch {
    console.warn('[Web Seeder] Tafsir data not available');
  }

  await database.runAsync('INSERT OR IGNORE INTO user_progress (id) VALUES (1)');
  await database.runAsync('INSERT OR IGNORE INTO gamification_state (id) VALUES (1)');

  // Seed vocabulary words
  try {
    const words: Array<{id: number; arabic: string; root: string | null; bengali: string; english: string | null; frequency: number; rank: number | null}> = await fetch('/assets/data/words.json').then(r => r.json());
    if (Array.isArray(words) && words.length > 0) {
      await database.withTransactionAsync(async () => {
        for (const w of words) {
          await database.runAsync(
            'INSERT OR IGNORE INTO words (id, arabic, root, bengali, english, frequency, rank) VALUES (?, ?, ?, ?, ?, ?, ?)',
            w.id, w.arabic, w.root, w.bengali, w.english, w.frequency, w.rank
          );
        }
      });
      console.log(`[Web Seeder] Inserted ${words.length} words`);
    }
  } catch {
    console.warn('[Web Seeder] Words data not available');
  }

  // Seed word occurrences
  try {
    const occurrences: Array<{word_id: number; ayah_id: number; position: number}> = await fetch('/assets/data/word_occurrences.json').then(r => r.json());
    if (Array.isArray(occurrences) && occurrences.length > 0) {
      await database.withTransactionAsync(async () => {
        for (const o of occurrences) {
          await database.runAsync(
            'INSERT OR IGNORE INTO word_occurrences (word_id, ayah_id, position) VALUES (?, ?, ?)',
            o.word_id, o.ayah_id, o.position
          );
        }
      });
      console.log(`[Web Seeder] Inserted ${occurrences.length} word occurrences`);
    }
  } catch {
    console.warn('[Web Seeder] Word occurrences data not available');
  }

  // Seed emotions
  try {
    const emotions: Array<{ayah_id: number; emotion: string; relevance: number}> = await fetch('/assets/data/emotions.json').then(r => r.json());
    if (Array.isArray(emotions) && emotions.length > 0) {
      await database.withTransactionAsync(async () => {
        for (const e of emotions) {
          await database.runAsync(
            'INSERT OR IGNORE INTO ayah_emotions (ayah_id, emotion, relevance) VALUES (?, ?, ?)',
            e.ayah_id, e.emotion, e.relevance
          );
        }
      });
      console.log(`[Web Seeder] Inserted ${emotions.length} emotion tags`);
    }
  } catch {
    console.warn('[Web Seeder] Emotions data not available');
  }

  console.log('[Web Seeder] ✅ Seeding complete');
  return database;
}

// ── Public API ─────────────────────────────────────────────────────

export async function getDatabase(): Promise<AppDatabase> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    if (Platform.OS === 'web') {
      db = await initWebDatabase();
    } else {
      db = await initNativeDatabase();
    }

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA user_version = ${DB_VERSION};
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ayah_id INTEGER NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
      );
      CREATE TABLE IF NOT EXISTS learned_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER NOT NULL UNIQUE,
        learned_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (word_id) REFERENCES words(id)
      );
    `);

    // On web, persist DB before page unloads
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (db) {
          db.closeAsync().catch(() => {});
          db = null;
          dbInitPromise = null;
        }
      });
    }

    return db;
  })();

  return dbInitPromise;
}

export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    dbInitPromise = null;
  }
  if (Platform.OS === 'web') {
    const { deleteWebDatabase } = await import('./web-database');
    await deleteWebDatabase(DB_NAME);
  } else {
    const SQLite = await import('expo-sqlite');
    await SQLite.deleteDatabaseAsync(DB_NAME);
  }
}
