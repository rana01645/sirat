#!/usr/bin/env node
// scripts/tag-ayah-emotions.js
// Scans all Bengali translations for emotion-related keywords
// and creates an ayah_emotions mapping in quran.db.
//
// Run: node scripts/tag-ayah-emotions.js

const { execSync } = require('child_process');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'assets', 'data', 'quran.db');

// Bengali keyword patterns for each emotion.
// Each emotion has primary (strong match) and secondary (weaker match) keywords.
const EMOTION_KEYWORDS = {
  anxious: {
    primary: [
      'ভয়', 'ভীত', 'আতঙ্ক', 'উদ্বিগ্ন', 'চিন্তা', 'শঙ্কা', 'আশঙ্কা',
      'অস্থির', 'বিচলিত', 'ঘাবড়', 'দুশ্চিন্তা', 'উৎকণ্ঠ',
    ],
    secondary: [
      'নিরাপত্তা', 'প্রশান্ত', 'শান্তি', 'ভরসা', 'তাওয়াক্কুল', 'আশ্রয়',
      'রক্ষা', 'সাহায্য', 'হেফাজত', 'নিরাপদ', 'ভয় করো না', 'ভয় নেই',
      'সান্ত্বনা', 'স্বস্তি', 'পরীক্ষা',
    ],
  },
  sad: {
    primary: [
      'দুঃখ', 'কান্না', 'শোক', 'বিষাদ', 'কষ্ট', 'বেদনা', 'ক্রন্দন',
      'অশ্রু', 'বিলাপ', 'মর্মাহত', 'ব্যথা', 'পীড়া', 'কাতর',
    ],
    secondary: [
      'সান্ত্বনা', 'সুসংবাদ', 'আনন্দ', 'খুশি', 'রহমত', 'দয়া',
      'বিপদ', 'মুসিবত', 'ধৈর্য', 'সবর', 'পরীক্ষা', 'কল্যাণ',
    ],
  },
  grateful: {
    primary: [
      'কৃতজ্ঞ', 'শুকর', 'শোকর', 'নিয়ামত', 'নেয়ামত', 'অনুগ্রহ',
      'কৃতজ্ঞতা', 'ধন্যবাদ', 'দান', 'রিযিক', 'রিজিক', 'জীবিকা',
    ],
    secondary: [
      'দয়া', 'রহমত', 'করুণা', 'অনুকম্পা', 'বরকত', 'সমৃদ্ধি',
      'প্রাচুর্য', 'সুখ', 'কল্যাণ', 'উত্তম', 'উপকার', 'আশীর্বাদ',
    ],
  },
  lonely: {
    primary: [
      'একাকী', 'নিঃসঙ্গ', 'একা', 'সঙ্গী', 'সাথী', 'বন্ধু',
      'নিকটে', 'নিকটবর্তী', 'কাছে', 'সান্নিধ্য',
    ],
    secondary: [
      'সাথে আছ', 'সাথে আছে', 'ত্যাগ করে', 'পরিত্যাগ', 'সম্পর্ক',
      'ভালোবাস', 'স্মরণ', 'যিকির', 'দোয়া', 'প্রার্থনা', 'ডাক',
    ],
  },
  frustrated: {
    primary: [
      'ধৈর্য', 'সবর', 'ক্রোধ', 'রাগ', 'ক্ষোভ', 'হতাশ', 'নিরাশ',
      'অধৈর্য', 'বিরক্ত', 'ক্লান্ত',
    ],
    secondary: [
      'সহ্য', 'অবিচল', 'দৃঢ়', 'প্রতিদান', 'পুরস্কার', 'ক্ষমা',
      'মাফ', 'ন্যায়', 'বিচার', 'প্রতিশোধ', 'অত্যাচার', 'জুলুম', 'যুলুম',
    ],
  },
  hopeful: {
    primary: [
      'আশা', 'আশাবাদ', 'প্রত্যাশা', 'সুসংবাদ', 'সুখবর', 'প্রতিশ্রুতি',
      'ওয়াদা', 'সাফল্য', 'বিজয়', 'সফল',
    ],
    secondary: [
      'রহমত', 'দয়া', 'জান্নাত', 'বেহেশত', 'পুরস্কার', 'কল্যাণ',
      'উত্তম', 'আলো', 'নূর', 'হেদায়েত', 'পথ', 'উন্নতি', 'পরিবর্তন',
    ],
  },
  lost: {
    primary: [
      'পথ', 'হেদায়েত', 'হিদায়াত', 'পথভ্রষ্ট', 'বিভ্রান্ত', 'দিশেহারা',
      'সরল পথ', 'সিরাতুল', 'গোমরাহ', 'ভ্রান্ত', 'পথহারা',
    ],
    secondary: [
      'আলো', 'নূর', 'অন্ধকার', 'জ্যোতি', 'জ্ঞান', 'ইলম', 'বুঝ',
      'হিকমত', 'দিকনির্দেশ', 'উদ্দেশ্য', 'লক্ষ্য', 'সত্য',
    ],
  },
  love: {
    primary: [
      'ভালোবাস', 'প্রেম', 'মুহাব্বত', 'মহব্বত', 'স্নেহ', 'দাম্পত্য',
      'স্বামী', 'স্ত্রী', 'জোড়া', 'যুগল', 'প্রশান্তি',
    ],
    secondary: [
      'হৃদয়', 'অন্তর', 'কলব', 'রহমত', 'দয়া', 'করুণা', 'মায়া',
      'সৌন্দর্য', 'পবিত্র', 'সন্তান', 'পরিবার', 'অনুরাগ',
    ],
  },
  seeking: {
    primary: [
      'জ্ঞান', 'ইলম', 'শিক্ষা', 'বুঝ', 'হিকমত', 'প্রজ্ঞা', 'চিন্তা',
      'গবেষণা', 'অনুসন্ধান', 'অন্বেষণ', 'জিজ্ঞাসা',
    ],
    secondary: [
      'চিন্তা কর', 'উপদেশ', 'নিদর্শন', 'আয়াত', 'নিশানী', 'সৃষ্টি',
      'আসমান', 'যমীন', 'আকাশ', 'পৃথিবী', 'বুদ্ধি', 'আকল', 'বিবেক',
      'তাফাক্কুর', 'তাদাব্বুর',
    ],
  },
};

function run() {
  console.log('🏷️  Tagging ayahs by emotion...\n');

  // Drop and recreate table
  execSync(`sqlite3 "${DB_PATH}" "DROP TABLE IF EXISTS ayah_emotions;"`, { stdio: 'pipe' });
  execSync(`sqlite3 "${DB_PATH}" "CREATE TABLE ayah_emotions (
    ayah_id INTEGER NOT NULL,
    emotion TEXT NOT NULL,
    relevance INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (ayah_id, emotion),
    FOREIGN KEY (ayah_id) REFERENCES ayahs(id)
  );"`, { stdio: 'pipe' });
  execSync(`sqlite3 "${DB_PATH}" "CREATE INDEX idx_emotion ON ayah_emotions(emotion, relevance DESC);"`, { stdio: 'pipe' });

  // Fetch all ayahs
  const rawRows = execSync(
    `sqlite3 -json "${DB_PATH}" "SELECT id, text_bengali FROM ayahs;"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString('utf-8');

  const ayahs = JSON.parse(rawRows);
  console.log(`📖 Loaded ${ayahs.length} ayahs\n`);

  const insertRows = [];
  const emotionCounts = {};

  for (const [emotionId, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    emotionCounts[emotionId] = 0;

    for (const ayah of ayahs) {
      const text = ayah.text_bengali.toLowerCase();
      let relevance = 0;

      // Check primary keywords (score 2 each)
      for (const kw of keywords.primary) {
        if (text.includes(kw.toLowerCase())) {
          relevance += 2;
        }
      }

      // Check secondary keywords (score 1 each)
      for (const kw of keywords.secondary) {
        if (text.includes(kw.toLowerCase())) {
          relevance += 1;
        }
      }

      if (relevance > 0) {
        insertRows.push(`(${ayah.id}, '${emotionId}', ${relevance})`);
        emotionCounts[emotionId]++;
      }
    }
  }

  console.log('📊 Emotion tag counts:');
  for (const [emotion, count] of Object.entries(emotionCounts)) {
    console.log(`   ${emotion}: ${count} ayahs`);
  }
  console.log(`\n   Total tags: ${insertRows.length}`);

  // Batch insert (chunks of 500)
  const BATCH = 500;
  for (let i = 0; i < insertRows.length; i += BATCH) {
    const batch = insertRows.slice(i, i + BATCH);
    const sql = `INSERT OR REPLACE INTO ayah_emotions (ayah_id, emotion, relevance) VALUES ${batch.join(',')};`;
    execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { stdio: 'pipe' });
  }

  console.log('\n✅ Done! ayah_emotions table populated.');
}

run();
