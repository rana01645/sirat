#!/usr/bin/env node
/**
 * Curated emotion tagging for Quranic ayahs.
 * 
 * Each verse is hand-selected based on thematic content, not keyword matching.
 * Format: { surah: verseNumber } or { surah: [v1, v2, v3] } for ranges.
 * ~100 verses per emotion = ~900 high-quality tags.
 */

const { execSync } = require('child_process');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'assets', 'data', 'quran.db');

// Helper: expand verse refs into [surahId, verseNumber] pairs
function expandRefs(refs) {
  const pairs = [];
  for (const [surah, verses] of Object.entries(refs)) {
    const s = parseInt(surah);
    if (Array.isArray(verses)) {
      for (const v of verses) {
        if (typeof v === 'object' && v.from && v.to) {
          for (let i = v.from; i <= v.to; i++) pairs.push([s, i]);
        } else {
          pairs.push([s, v]);
        }
      }
    } else if (typeof verses === 'object' && verses.from && verses.to) {
      for (let i = verses.from; i <= verses.to; i++) pairs.push([s, i]);
    } else {
      pairs.push([s, verses]);
    }
  }
  return pairs;
}

// ============================================================
// CURATED VERSE TAGS — based on thematic Quranic scholarship
// ============================================================

const EMOTION_TAGS = {
  // ANXIOUS — verses about trust in Allah, relief from worry, divine sufficiency
  anxious: {
    2: [153, 155, 156, 214, 216, 286],
    3: [139, 140, 159, 173, 174, 175],
    4: [19, 29],
    6: [17, 59],
    7: [56, 96],
    8: [2, 10, 46],
    9: [40, 51, 129],
    10: [62, 107],
    11: [88, 123],
    12: [67, 87],
    13: [28, 29],
    14: [7, 27, 31],
    15: [56, 99],
    16: [42, 96, 97, 127, 128],
    17: [68, 84],
    18: [23, 24],
    20: [1, 2, 46],
    21: [83, 87, 88],
    22: [78],
    23: [96, 118],
    24: [35, 55],
    25: [58],
    26: [62, 79, 80],
    27: [62],
    28: [7, 10],
    29: [2, 3, 60, 69],
    31: [17, 34],
    33: [3, 21, 41, 42, 43, 47, 48],
    35: [2, 34],
    39: [36, 53, 61],
    40: [44, 51],
    41: [30, 31, 32],
    42: [36],
    46: [35],
    48: [4],
    57: [4, 22, 23],
    58: [11],
    64: [11, 13],
    65: [2, 3],
    73: [9],
    93: [1, 2, 3, 4, 5],
    94: [1, 2, 3, 4, 5, 6, 7, 8],
    95: [4],
  },

  // SAD — comfort in grief, patience in loss, divine closeness in sorrow
  sad: {
    2: [155, 156, 157, 214, 286],
    3: [120, 139, 140, 146, 170, 185],
    6: [33],
    9: [40],
    10: [62, 65],
    11: [11, 115],
    12: [18, 83, 86, 87],
    13: [28],
    15: [88, 97],
    16: [96, 97, 127],
    17: [82],
    18: [6],
    19: [96],
    20: [130, 131, 132],
    21: [83, 84, 87, 88],
    23: [118],
    25: [20],
    26: [80],
    27: [62],
    28: [7, 24],
    29: [2, 3],
    30: [36, 60],
    31: [17],
    33: [21, 47],
    35: [34],
    36: [76],
    38: [44],
    39: [10, 53],
    40: [44, 55, 77],
    41: [30, 31, 32, 34, 35],
    42: [30, 43],
    43: [13],
    46: [35],
    47: [31],
    50: [39],
    52: [48],
    53: [43],
    57: [22, 23],
    58: [10],
    64: [11],
    65: [7],
    68: [48],
    73: [10],
    86: [9],
    90: [4],
    93: [1, 2, 3, 4, 5, 6, 7, 8],
    94: [1, 2, 3, 4, 5, 6, 7, 8],
  },

  // GRATEFUL — gratitude, counting blessings, remembering Allah's favors
  grateful: {
    1: [2],
    2: [152, 172, 185, 243],
    3: [144, 145],
    5: [6, 89],
    7: [10, 58, 69, 74, 189],
    8: [26],
    10: [60],
    14: [5, 7, 28, 32, 33, 34, 37],
    16: [10, 11, 12, 13, 14, 15, 16, 18, 53, 66, 72, 78, 114, 121],
    17: [37, 44],
    22: [36, 37, 65, 66],
    23: [78],
    25: [48, 49, 50, 62],
    26: [7, 8, 78, 79, 80],
    27: [15, 19, 40, 73],
    28: [73],
    29: [17, 63],
    30: [21, 22, 46, 50],
    31: [12, 20, 31],
    34: [13, 15],
    35: [3, 12, 27, 28],
    36: [33, 34, 35, 36, 73],
    37: [15],
    39: [7, 66],
    40: [61, 64, 65],
    41: [37, 39],
    42: [32, 33],
    45: [12, 13],
    46: [15],
    51: [49],
    53: [43, 44, 45, 48, 49],
    55: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13],
    56: [68, 69, 70, 71, 72, 73],
    67: [23, 24],
    76: [1, 2, 3],
    78: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    80: [24, 25, 26, 27, 28, 29, 30, 31, 32],
    93: [6, 7, 8, 9, 10, 11],
  },

  // LONELY — divine companionship, Allah's nearness, never being alone
  lonely: {
    2: [115, 152, 186, 257],
    3: [68, 139],
    4: [1, 126, 145],
    5: [105],
    6: [59, 103],
    7: [196],
    8: [24],
    9: [40, 119],
    10: [62],
    11: [61, 92],
    12: [86, 92],
    13: [28],
    15: [49, 97],
    16: [128],
    17: [1],
    18: [24, 28],
    19: [4, 5, 6, 96],
    20: [25, 46],
    22: [78],
    24: [35],
    25: [6, 59],
    26: [62, 217, 218, 219, 220],
    27: [62],
    28: [7],
    29: [36, 45, 69],
    33: [21, 41, 42, 43, 45, 46, 47, 56],
    35: [15],
    39: [53],
    40: [60],
    41: [30, 31, 32, 33],
    42: [11, 19],
    46: [15],
    48: [29],
    49: [10],
    50: [16],
    51: [50, 56],
    52: [48, 49],
    57: [1, 2, 3, 4, 5],
    58: [7],
    59: [22, 23, 24],
    66: [11, 12],
    67: [12],
    73: [8],
    87: [1, 2, 3],
    89: [27, 28, 29, 30],
    112: [1, 2, 3, 4],
  },

  // FRUSTRATED — patience under trial, perseverance, controlling anger
  frustrated: {
    2: [45, 153, 177, 214, 250],
    3: [134, 135, 136, 139, 186, 200],
    4: [19, 32],
    6: [34, 135],
    7: [87, 128],
    10: [109],
    11: [11, 49, 115],
    12: [18, 83, 90],
    13: [22, 24],
    14: [12],
    16: [42, 96, 110, 126, 127, 128],
    17: [83],
    18: [28, 68, 69],
    20: [130, 132],
    21: [85],
    22: [35],
    23: [111],
    25: [20, 42, 75],
    28: [54, 80],
    29: [2, 3, 58, 59, 60, 69],
    31: [17, 31],
    32: [24],
    33: [35, 48],
    37: [102],
    38: [17, 44],
    39: [10],
    40: [55, 77],
    41: [34, 35],
    42: [36, 37, 39, 43],
    46: [35],
    47: [31],
    48: [29],
    50: [39],
    52: [48],
    68: [48, 50, 51],
    70: [5],
    73: [10, 11],
    76: [24],
    90: [4],
    94: [5, 6, 7, 8],
    103: [1, 2, 3],
  },

  // HOPEFUL — mercy of Allah, good future, light after darkness, paradise
  hopeful: {
    2: [62, 112, 186, 195, 214, 216, 245, 261, 268, 286],
    3: [8, 103, 133, 139, 185, 195],
    4: [40, 110, 147, 175],
    5: [9, 35, 54, 119],
    6: [12, 54, 160],
    7: [23, 56, 96, 156],
    8: [29],
    9: [102, 111, 112],
    10: [57, 58, 62],
    11: [90],
    12: [87, 98, 101],
    13: [6],
    15: [49, 56],
    17: [8, 25],
    18: [2, 30, 58, 107, 110],
    19: [60, 61, 62, 63],
    20: [82],
    21: [101, 102, 103, 104, 105],
    22: [50],
    23: [1, 10, 11],
    24: [55],
    25: [70, 71, 75, 76],
    29: [5, 58, 69],
    30: [36, 60],
    31: [8, 9],
    32: [16, 17],
    33: [35, 71],
    35: [7],
    36: [11, 58],
    38: [53, 54],
    39: [10, 34, 53],
    40: [7, 9],
    42: [25, 26],
    44: [51, 52, 53, 54, 55, 56, 57],
    47: [2, 12],
    48: [5, 29],
    51: [15, 16, 17, 18, 19],
    52: [17, 19, 20, 21, 22],
    55: [46, 48, 50, 52, 54, 56, 58, 60, 62],
    56: [10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    57: [12, 21],
    64: [9, 17],
    65: [2, 3],
    66: [8],
    76: [5, 6, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    93: [4, 5],
    94: [5, 6, 7, 8],
    97: [1, 2, 3, 4, 5],
    108: [1],
    110: [1, 2, 3],
  },

  // LOST — guidance, finding purpose, returning to the straight path
  lost: {
    1: [5, 6, 7],
    2: [2, 38, 120, 150, 185, 213, 256, 257, 269],
    3: [7, 8, 73, 101, 103],
    4: [68, 69, 136, 175],
    5: [15, 16, 46],
    6: [71, 82, 90, 97, 122, 125, 153, 161],
    7: [30, 43, 146, 181],
    9: [18, 33, 71],
    10: [25, 35, 57, 108],
    11: [56],
    12: [108],
    13: [11, 27, 28],
    14: [1, 5],
    16: [9, 36, 64, 89, 125],
    17: [9, 15, 82, 84],
    18: [1, 2, 17, 24, 28],
    19: [76],
    20: [50, 82, 123, 124],
    22: [54],
    23: [71, 73],
    24: [35, 46],
    25: [1, 27, 28, 29],
    27: [1, 2, 77],
    28: [56],
    29: [69],
    30: [30],
    31: [2, 3, 4, 5],
    32: [3],
    33: [4],
    35: [32],
    36: [1, 2, 3, 4],
    37: [99, 100],
    38: [29],
    39: [17, 18, 22, 23, 41, 53, 69],
    40: [38],
    42: [52, 53],
    43: [43],
    46: [30],
    47: [17],
    53: [23],
    61: [9],
    64: [11],
    71: [28],
    72: [1, 2],
    87: [8, 9],
    91: [7, 8, 9, 10],
    93: [7],
    96: [1, 2, 3, 4, 5],
    108: [2],
  },

  // LOVE — divine love, love between people, mercy, compassion
  love: {
    1: [1, 3],
    2: [165, 195, 222],
    3: [14, 15, 16, 17, 31, 76, 134, 146, 148, 159],
    5: [54, 93],
    6: [12],
    7: [23, 43, 56],
    9: [108],
    11: [7, 90],
    12: [4, 30, 31, 53, 64, 84, 100],
    16: [72],
    17: [24],
    19: [25, 26, 62, 96],
    20: [39],
    21: [107],
    25: [74],
    26: [78, 79, 80, 82, 83, 84, 85],
    28: [54, 77],
    29: [46],
    30: [21],
    31: [13, 14, 15],
    33: [4, 21, 35, 56],
    38: [25],
    42: [23],
    46: [15],
    48: [29],
    49: [7, 10, 11, 12, 13],
    50: [16],
    57: [23, 27],
    59: [9, 10, 22, 23],
    60: [7, 8],
    61: [4],
    66: [6, 11],
    76: [8, 9],
    85: [14],
    89: [15, 16, 17, 18],
    90: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    93: [6, 7, 8, 9, 10, 11],
    107: [1, 2, 3, 4, 5, 6, 7],
    112: [1],
  },

  // SEEKING — knowledge, reflection, understanding creation, wisdom
  seeking: {
    2: [164, 219, 269],
    3: [7, 18, 19, 58, 190, 191, 192],
    4: [82, 162],
    5: [100],
    6: [38, 50, 75, 76, 95, 97, 98, 99],
    7: [52, 176, 185],
    10: [5, 6, 24, 67, 100, 101],
    12: [2, 3, 108, 111],
    13: [2, 3, 4, 16, 19],
    15: [19, 85],
    16: [43, 44, 68, 69, 78, 90],
    17: [12, 36, 44, 85, 88],
    18: [54, 60, 65, 66, 109],
    20: [98, 114],
    21: [30, 31, 32, 33],
    22: [46, 70],
    23: [12, 13, 14],
    24: [35, 40],
    25: [2],
    27: [88],
    29: [19, 20, 43, 44, 69],
    30: [8, 20, 21, 22, 24],
    31: [27],
    32: [4, 5, 6, 7, 8, 9],
    35: [27, 28],
    36: [36, 37, 38, 39, 40],
    38: [29],
    39: [9, 18, 21, 42, 62],
    41: [53],
    42: [29],
    45: [3, 4, 5, 13],
    46: [3, 4],
    47: [24],
    50: [6, 7],
    51: [20, 21, 47, 49, 56],
    55: [1, 2, 3, 4, 33],
    56: [57, 58, 59, 60, 61, 62, 63, 64],
    57: [17],
    58: [11],
    67: [3, 4, 5, 19],
    71: [13, 14, 15, 16, 17, 18, 19, 20],
    86: [5, 6, 7, 8, 11, 12],
    87: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    88: [17, 18, 19, 20],
    96: [1, 2, 3, 4, 5],
  },
};

// ============================================================
// Main: rebuild ayah_emotions table with curated tags
// ============================================================

async function main() {
  const sqlite3 = require('better-sqlite3');
  let db;

  try {
    db = sqlite3(DB_PATH);
  } catch {
    // Fallback to sqlite3 CLI
    console.log('better-sqlite3 not found, using sqlite3 CLI...');
    runWithCLI();
    return;
  }

  db.pragma('journal_mode = WAL');

  // Drop old tags and recreate
  db.exec('DROP TABLE IF EXISTS ayah_emotions');
  db.exec(`
    CREATE TABLE ayah_emotions (
      ayah_id INTEGER NOT NULL,
      emotion TEXT NOT NULL,
      relevance INTEGER DEFAULT 3,
      PRIMARY KEY (ayah_id, emotion)
    )
  `);

  const findAyah = db.prepare('SELECT id FROM ayahs WHERE surah_id = ? AND verse_number = ?');
  const insertTag = db.prepare('INSERT OR IGNORE INTO ayah_emotions (ayah_id, emotion, relevance) VALUES (?, ?, ?)');

  let totalTags = 0;
  let missingVerses = 0;

  const insertAll = db.transaction(() => {
    for (const [emotion, refs] of Object.entries(EMOTION_TAGS)) {
      const pairs = expandRefs(refs);
      let count = 0;

      for (const [surahId, verseNum] of pairs) {
        const row = findAyah.get(surahId, verseNum);
        if (row) {
          insertTag.run(row.id, emotion, 3); // relevance=3 for curated
          count++;
        } else {
          console.warn(`  ⚠ Missing: ${surahId}:${verseNum}`);
          missingVerses++;
        }
      }

      console.log(`  ${emotion}: ${count} verses tagged`);
      totalTags += count;
    }
  });

  insertAll();

  // Create index for fast queries
  db.exec('CREATE INDEX IF NOT EXISTS idx_ayah_emotions_emotion ON ayah_emotions(emotion)');

  console.log(`\n✅ Done! ${totalTags} curated tags across ${Object.keys(EMOTION_TAGS).length} emotions`);
  if (missingVerses > 0) console.log(`⚠ ${missingVerses} verse references not found in DB`);

  // Show stats
  const stats = db.prepare('SELECT emotion, COUNT(*) as c FROM ayah_emotions GROUP BY emotion ORDER BY c DESC').all();
  console.log('\nEmotion counts:');
  for (const s of stats) console.log(`  ${s.emotion}: ${s.c}`);

  db.close();
}

function runWithCLI() {
  let sql = `DROP TABLE IF EXISTS ayah_emotions;
CREATE TABLE ayah_emotions (
  ayah_id INTEGER NOT NULL,
  emotion TEXT NOT NULL,
  relevance INTEGER DEFAULT 3,
  PRIMARY KEY (ayah_id, emotion)
);
`;

  for (const [emotion, refs] of Object.entries(EMOTION_TAGS)) {
    const pairs = expandRefs(refs);
    for (const [surahId, verseNum] of pairs) {
      sql += `INSERT OR IGNORE INTO ayah_emotions (ayah_id, emotion, relevance) SELECT id, '${emotion}', 3 FROM ayahs WHERE surah_id=${surahId} AND verse_number=${verseNum};\n`;
    }
  }

  sql += `CREATE INDEX IF NOT EXISTS idx_ayah_emotions_emotion ON ayah_emotions(emotion);\n`;
  sql += `SELECT emotion, COUNT(*) as c FROM ayah_emotions GROUP BY emotion ORDER BY c DESC;\n`;

  execSync(`sqlite3 "${DB_PATH}" <<'EOSQL'\n${sql}\nEOSQL`, { stdio: 'inherit' });
}

main().catch(console.error);
