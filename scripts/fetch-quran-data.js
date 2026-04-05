/**
 * fetch-quran-data.js
 *
 * Downloads authentic Quranic data from the Quran.com v4 API
 * and saves raw JSON into assets/data/ for offline SQLite seeding.
 *
 * Endpoints:
 *   1. Surah metadata (Bengali)  → assets/data/surahs.json
 *   2. Uthmani Arabic text        → assets/data/ayahs.json
 *   3. Bengali translation (#161) → assets/data/translations_bn.json
 *
 * Usage: node scripts/fetch-quran-data.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'data');

const ENDPOINTS = [
  {
    name: 'surahs',
    url: 'https://api.quran.com/api/v4/chapters?language=bn',
    file: 'surahs.json',
  },
  {
    name: 'ayahs (uthmani)',
    url: 'https://api.quran.com/api/v4/quran/verses/uthmani',
    file: 'ayahs.json',
  },
  {
    name: 'translations (Bengali #161)',
    url: 'https://api.quran.com/api/v4/quran/translations/161',
    file: 'translations_bn.json',
  },
];

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`  ⚠ Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      // Wait before retry (exponential backoff)
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  console.log('🕌 Quran Data Fetcher\n');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const endpoint of ENDPOINTS) {
    const outPath = path.join(OUTPUT_DIR, endpoint.file);
    console.log(`📥 Fetching ${endpoint.name}...`);
    console.log(`   URL: ${endpoint.url}`);

    try {
      const data = await fetchWithRetry(endpoint.url);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

      const stats = fs.statSync(outPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ✅ Saved → ${endpoint.file} (${sizeMB} MB)\n`);
    } catch (err) {
      console.error(`   ❌ Failed to fetch ${endpoint.name}: ${err.message}\n`);
      process.exit(1);
    }
  }

  // Print summary
  console.log('─'.repeat(40));
  console.log('✅ All data downloaded successfully!');

  // Quick data validation
  const surahs = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'surahs.json'), 'utf-8'));
  const ayahs = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'ayahs.json'), 'utf-8'));
  const trans = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'translations_bn.json'), 'utf-8'));

  const surahCount = surahs.chapters?.length ?? 0;
  const ayahCount = ayahs.verses?.length ?? 0;
  const transCount = trans.translations?.length ?? 0;

  console.log(`\n📊 Validation:`);
  console.log(`   Surahs:       ${surahCount} (expected: 114)`);
  console.log(`   Ayahs:        ${ayahCount} (expected: 6,236)`);
  console.log(`   Translations: ${transCount} (expected: 6,236)`);

  if (surahCount !== 114) console.warn('   ⚠ Surah count mismatch!');
  if (ayahCount !== 6236) console.warn('   ⚠ Ayah count mismatch!');
  if (transCount !== 6236) console.warn('   ⚠ Translation count mismatch!');
}

main();
