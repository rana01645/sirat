// src/shared/lib/database.ts
// SQLite database initializer — offline-first engine
// Uses pre-built quran.db shipped as an asset for instant first launch.

import * as SQLite from 'expo-sqlite';
import { importDatabaseFromAssetAsync } from 'expo-sqlite';

const DB_NAME = 'quran_app.db';
// Bump this when the pre-built DB schema changes (e.g. new tables added).
// Forces a re-copy from the asset, preserving user data via migration.
const DB_VERSION = 2; // v2: added words + word_occurrences tables

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  // Check if we need to force overwrite (schema version changed)
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
    // DB doesn't exist yet, fresh install
    needsOverwrite = false;
  }

  // Copy pre-built DB from asset
  await importDatabaseFromAssetAsync(DB_NAME, {
    assetId: require('@/assets/data/quran.db'),
    forceOverwrite: needsOverwrite,
  });

  db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA user_version = ${DB_VERSION};
  `);

  // Runtime migrations for tables added after initial DB build
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

  return db;
}

export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME);
}
