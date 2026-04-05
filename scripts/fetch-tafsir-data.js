// scripts/fetch-tafsir-data.js
// Fetches Bengali tafsir (Ahsanul Bayaan, ID: 165) per chapter from Quran.com v4 API.
// Concise footnote-style tafsir — ideal for Clear Quran UX.
// Saves to assets/data/tafsir_bn.json

const https = require('https');
const fs = require('fs');
const path = require('path');

const TAFSIR_ID = 165;
const TOTAL_CHAPTERS = 114;
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'data', 'tafsir_bn.json');
const DELAY_MS = 300; // be kind to the API

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${e.message}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const allTafsirs = [];
  let totalVerses = 0;

  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    const url = `https://api.quran.com/api/v4/tafsirs/${TAFSIR_ID}/by_chapter/${ch}`;
    
    try {
      const data = await fetch(url);
      const tafsirs = data.tafsirs || [];
      
      // Handle pagination if needed
      let allChapterTafsirs = [...tafsirs];
      let pagination = data.pagination;
      
      while (pagination && pagination.next_page) {
        await sleep(DELAY_MS);
        const nextUrl = `${url}?page=${pagination.next_page}`;
        const nextData = await fetch(nextUrl);
        allChapterTafsirs = allChapterTafsirs.concat(nextData.tafsirs || []);
        pagination = nextData.pagination;
      }

      for (const t of allChapterTafsirs) {
        allTafsirs.push({
          verse_key: t.verse_key,
          text: stripHtml(t.text),
        });
      }

      totalVerses += allChapterTafsirs.length;
      process.stdout.write(`\r  Chapter ${ch}/114 — ${allChapterTafsirs.length} verses (total: ${totalVerses})`);
    } catch (err) {
      console.error(`\n  ERROR on chapter ${ch}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n  Writing ${allTafsirs.length} tafsir entries to ${OUTPUT_FILE}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTafsirs, null, 0), 'utf-8');
  
  const sizeMB = (fs.statSync(OUTPUT_FILE).size / (1024 * 1024)).toFixed(1);
  console.log(`  Done! File size: ${sizeMB} MB`);
}

main().catch(console.error);
