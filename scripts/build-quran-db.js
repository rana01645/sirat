#!/usr/bin/env node
// Builds a pre-seeded SQLite database from the Quran JSON data files.
// This eliminates runtime JSON parsing and speeds up first launch dramatically.
// Output: assets/data/quran.db

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'assets', 'data');
const DB_PATH = path.join(DATA_DIR, 'quran.db');

// Remove existing DB if present
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('Removed existing quran.db');
}

// Load JSON data
const surahs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'surahs.json'), 'utf8'));
const ayahs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ayahs.json'), 'utf8'));
const translations = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'translations_bn.json'), 'utf8'));

const tafsirPath = path.join(DATA_DIR, 'tafsir_bn.json');
const tafsirList = fs.existsSync(tafsirPath)
  ? JSON.parse(fs.readFileSync(tafsirPath, 'utf8'))
  : [];

const chapters = surahs.chapters;
const verses = ayahs.verses;
const translationsList = translations.translations;

if (verses.length !== translationsList.length) {
  throw new Error(`Mismatch: ${verses.length} ayahs vs ${translationsList.length} translations`);
}

console.log(`Building quran.db: ${chapters.length} surahs, ${verses.length} ayahs, ${tafsirList.length} tafsirs...`);

// Build SQL statements
const sqlStatements = [];

// Schema
sqlStatements.push(`
CREATE TABLE IF NOT EXISTS surahs (
  id INTEGER PRIMARY KEY,
  name_arabic TEXT NOT NULL,
  name_bengali TEXT NOT NULL,
  revelation_place TEXT NOT NULL,
  verses_count INTEGER NOT NULL
);
`);

sqlStatements.push(`
CREATE TABLE IF NOT EXISTS ayahs (
  id INTEGER PRIMARY KEY,
  surah_id INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  text_uthmani TEXT NOT NULL,
  text_bengali TEXT NOT NULL,
  FOREIGN KEY (surah_id) REFERENCES surahs(id)
);
`);

sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_ayahs_surah ON ayahs(surah_id, verse_number);`);

sqlStatements.push(`
CREATE TABLE IF NOT EXISTS tafsirs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_key TEXT NOT NULL,
  surah_id INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  text_bengali TEXT NOT NULL
);
`);

sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_tafsirs_verse ON tafsirs(surah_id, verse_number);`);

// App tables
sqlStatements.push(`
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
`);

sqlStatements.push(`
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ayah_id INTEGER NOT NULL,
  reflection_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
);
`);

sqlStatements.push(`
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ayah_id INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
);
`);

sqlStatements.push(`
CREATE TABLE IF NOT EXISTS gamification_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ilm_coins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  nur_level INTEGER NOT NULL DEFAULT 1,
  total_ayahs_read INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  last_session_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

sqlStatements.push(`
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
`);

sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);`);

sqlStatements.push(`
CREATE TABLE IF NOT EXISTS reading_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ayah_id INTEGER NOT NULL,
  surah_id INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  read_date TEXT NOT NULL DEFAULT (date('now')),
  FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
);
`);

sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_reading_history_date ON reading_history(read_date);`);
sqlStatements.push(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_history_unique ON reading_history(ayah_id, read_date);`);

// Singleton rows
sqlStatements.push(`INSERT OR IGNORE INTO user_progress (id) VALUES (1);`);
sqlStatements.push(`INSERT OR IGNORE INTO gamification_state (id) VALUES (1);`);

sqlStatements.push('BEGIN TRANSACTION;');

// Insert surahs
for (const ch of chapters) {
  const nameArabic = ch.name_arabic.replace(/'/g, "''");
  const nameBengali = ch.translated_name.name.replace(/'/g, "''");
  const place = ch.revelation_place.replace(/'/g, "''");
  sqlStatements.push(
    `INSERT OR IGNORE INTO surahs (id, name_arabic, name_bengali, revelation_place, verses_count) VALUES (${ch.id}, '${nameArabic}', '${nameBengali}', '${place}', ${ch.verses_count});`
  );
}

// Insert ayahs with flattened Bengali
for (let i = 0; i < verses.length; i++) {
  const verse = verses[i];
  const translation = translationsList[i];
  const [surahId, verseNumber] = verse.verse_key.split(':').map(Number);
  const textUthmani = verse.text_uthmani.replace(/'/g, "''");
  const textBengali = translation.text.replace(/'/g, "''");

  sqlStatements.push(
    `INSERT OR IGNORE INTO ayahs (id, surah_id, verse_number, text_uthmani, text_bengali) VALUES (${verse.id}, ${surahId}, ${verseNumber}, '${textUthmani}', '${textBengali}');`
  );
}

// Insert tafsirs (cap at 8000 chars for mobile readability)
const TAFSIR_MAX_LEN = 8000;
for (const t of tafsirList) {
  const [surahId, verseNumber] = t.verse_key.split(':').map(Number);
  let rawText = t.text;
  if (rawText.length > TAFSIR_MAX_LEN) {
    rawText = rawText.substring(0, TAFSIR_MAX_LEN) + '...';
  }
  const text = rawText.replace(/'/g, "''");
  sqlStatements.push(
    `INSERT INTO tafsirs (verse_key, surah_id, verse_number, text_bengali) VALUES ('${t.verse_key}', ${surahId}, ${verseNumber}, '${text}');`
  );
}

sqlStatements.push('COMMIT;');

// Write SQL to temp file and execute with sqlite3
const sqlPath = path.join(DATA_DIR, '_build.sql');
fs.writeFileSync(sqlPath, sqlStatements.join('\n'), 'utf8');

try {
  execSync(`sqlite3 "${DB_PATH}" < "${sqlPath}"`, { stdio: 'inherit' });
  console.log('✅ quran.db built successfully!');
  
  // Verify
  const count = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM surahs; SELECT COUNT(*) FROM ayahs; SELECT COUNT(*) FROM tafsirs;"`).toString().trim();
  const [surahCount, ayahCount, tafsirCount] = count.split('\n');
  console.log(`   Surahs: ${surahCount}, Ayahs: ${ayahCount}, Tafsirs: ${tafsirCount}`);
} finally {
  // Clean up temp SQL file
  if (fs.existsSync(sqlPath)) {
    fs.unlinkSync(sqlPath);
  }
}
