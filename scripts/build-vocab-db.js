#!/usr/bin/env node
/**
 * build-vocab-db.js
 * 
 * Extracts word-by-word data from Word-By-Word-Quran-Android's wordbyword.db
 * and adds vocabulary tables (words, word_occurrences) into our quran.db.
 * 
 * Usage: node scripts/build-vocab-db.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SOURCE_DB = path.join(__dirname, '..', '..', 'quran-wbw-android', 'app', 'src', 'main', 'assets', 'databases', 'wordbyword.db');
const TARGET_DB = path.join(__dirname, '..', 'assets', 'data', 'quran.db');

function sqliteQuery(dbPath, query) {
  return execSync(`sqlite3 "${dbPath}" "${query}"`, { maxBuffer: 50 * 1024 * 1024 }).toString().trim();
}

function sqliteQueryRows(dbPath, query) {
  const raw = execSync(`sqlite3 -separator '|||' "${dbPath}" "${query}"`, { maxBuffer: 50 * 1024 * 1024 }).toString().trim();
  if (!raw) return [];
  return raw.split('\n').map(line => line.split('|||'));
}

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function main() {
  console.log('📖 Building vocabulary tables...');

  if (!fs.existsSync(SOURCE_DB)) {
    console.error(`❌ Source DB not found: ${SOURCE_DB}`);
    console.error('   Run: cd .. && git clone --depth 1 https://github.com/SadaqaWorks/Word-By-Word-Quran-Android.git quran-wbw-android');
    process.exit(1);
  }

  // ── Step 1: Extract data from source ──
  console.log('📊 Extracting words from source DB...');
  
  const sourceRows = sqliteQueryRows(SOURCE_DB,
    `SELECT b.surah_id, b.verse_id, b.words_id, b.words_ar, b.translate_bn, b.translate_en, COALESCE(c.root,'')
     FROM bywords b
     LEFT JOIN quran_corpus c ON c.surah = b.surah_id AND c.ayah = b.verse_id AND c.word = b.words_id
     ORDER BY b.surah_id, b.verse_id, b.words_id`
  );
  console.log(`  ${sourceRows.length} word occurrences extracted`);

  // ── Step 2: Build ayah_id lookup from our quran.db ──
  console.log('🔗 Building ayah ID lookup...');
  const ayahRows = sqliteQueryRows(TARGET_DB, 'SELECT id, surah_id, verse_number FROM ayahs');
  const ayahIdMap = new Map();
  for (const [id, surahId, verseNum] of ayahRows) {
    ayahIdMap.set(`${surahId}:${verseNum}`, id);
  }

  // ── Step 3: Group by surface form ──
  console.log('🔤 Grouping by Arabic surface form...');
  const wordGroups = new Map();

  for (const [surahId, verseId, position, arabic, bengali, english, root] of sourceRows) {
    if (!arabic || arabic.trim() === '') continue;

    if (!wordGroups.has(arabic)) {
      wordGroups.set(arabic, {
        arabic,
        bengali: bengali || '',
        english: english || '',
        root: root || '',
        count: 0,
        occurrences: [],
      });
    }

    const group = wordGroups.get(arabic);
    group.count++;

    const ayahId = ayahIdMap.get(`${surahId}:${verseId}`);
    if (ayahId) {
      group.occurrences.push({ ayahId, position: parseInt(position, 10) });
    }
  }

  // Sort by frequency
  const sortedWords = [...wordGroups.values()].sort((a, b) => b.count - a.count);
  console.log(`  ${sortedWords.length} unique words`);

  // ── Step 4: Generate SQL ──
  console.log('💾 Generating SQL...');
  const sqlStatements = [];

  sqlStatements.push('DROP TABLE IF EXISTS learned_words;');
  sqlStatements.push('DROP TABLE IF EXISTS word_occurrences;');
  sqlStatements.push('DROP TABLE IF EXISTS words;');

  sqlStatements.push(`CREATE TABLE words (
  id INTEGER PRIMARY KEY,
  arabic TEXT NOT NULL,
  root TEXT,
  bengali TEXT NOT NULL,
  english TEXT,
  frequency INTEGER NOT NULL DEFAULT 1,
  rank INTEGER
);`);

  sqlStatements.push(`CREATE TABLE word_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL,
  ayah_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (word_id) REFERENCES words(id),
  FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
);`);

  sqlStatements.push(`CREATE TABLE learned_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL UNIQUE,
  learned_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (word_id) REFERENCES words(id)
);`);

  // Insert words and occurrences
  let wordId = 1;
  let totalOcc = 0;
  for (const word of sortedWords) {
    sqlStatements.push(
      `INSERT INTO words (id, arabic, root, bengali, english, frequency, rank) VALUES (${wordId}, '${escapeSql(word.arabic)}', '${escapeSql(word.root)}', '${escapeSql(word.bengali)}', '${escapeSql(word.english)}', ${word.count}, ${wordId});`
    );

    for (const occ of word.occurrences) {
      sqlStatements.push(
        `INSERT INTO word_occurrences (word_id, ayah_id, position) VALUES (${wordId}, ${occ.ayahId}, ${occ.position});`
      );
      totalOcc++;
    }
    wordId++;
  }

  // Indices
  sqlStatements.push('CREATE INDEX idx_words_arabic ON words(arabic);');
  sqlStatements.push('CREATE INDEX idx_words_root ON words(root);');
  sqlStatements.push('CREATE INDEX idx_words_rank ON words(rank);');
  sqlStatements.push('CREATE INDEX idx_words_frequency ON words(frequency DESC);');
  sqlStatements.push('CREATE INDEX idx_word_occ_word ON word_occurrences(word_id);');
  sqlStatements.push('CREATE INDEX idx_word_occ_ayah ON word_occurrences(ayah_id);');

  console.log(`  ${sqlStatements.length} SQL statements (${totalOcc} occurrences)`);

  // ── Step 5: Write to temp file and execute ──
  const sqlPath = path.join(os.tmpdir(), 'vocab_build.sql');
  const fullSql = 'BEGIN TRANSACTION;\n' + sqlStatements.join('\n') + '\nCOMMIT;\n';
  fs.writeFileSync(sqlPath, fullSql, 'utf-8');
  console.log(`  SQL file: ${(fullSql.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('⚡ Executing SQL (this may take a minute)...');
  execSync(`sqlite3 "${TARGET_DB}" < "${sqlPath}"`, { stdio: 'inherit', maxBuffer: 50 * 1024 * 1024 });

  // ── Step 6: Verify ──
  const wc = sqliteQuery(TARGET_DB, 'SELECT COUNT(*) FROM words;');
  const oc = sqliteQuery(TARGET_DB, 'SELECT COUNT(*) FROM word_occurrences;');
  const rc = sqliteQuery(TARGET_DB, "SELECT COUNT(DISTINCT root) FROM words WHERE root != '';");

  console.log(`\n✅ Vocabulary build complete!`);
  console.log(`  Words: ${wc}`);
  console.log(`  Occurrences: ${oc}`);
  console.log(`  Unique roots: ${rc}`);

  // Top 10
  console.log('\n  Top 10 most frequent:');
  const top10 = sqliteQueryRows(TARGET_DB,
    'SELECT rank, arabic, bengali, frequency FROM words ORDER BY rank LIMIT 10'
  );
  for (const [rank, arabic, bengali, freq] of top10) {
    console.log(`    #${rank} ${arabic} → ${bengali} (${freq}x)`);
  }

  // Coverage
  const total = parseInt(sqliteQuery(TARGET_DB, 'SELECT SUM(frequency) FROM words;'), 10);
  console.log('\n  Cumulative coverage:');
  for (const n of [100, 200, 300, 500, 700, 1000]) {
    const cum = parseInt(sqliteQuery(TARGET_DB, `SELECT SUM(frequency) FROM words WHERE rank <= ${n};`), 10);
    console.log(`    Top ${n} words = ${((cum / total) * 100).toFixed(1)}% of Quran`);
  }

  const sizeBytes = fs.statSync(TARGET_DB).size;
  console.log(`\n  Database size: ${(sizeBytes / 1024 / 1024).toFixed(1)} MB`);

  fs.unlinkSync(sqlPath);
}

main();
