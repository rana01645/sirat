// useContextTafsir — Fetches শানে নুযূল (revelation context) from Ibn Kathir Bengali.
// Ibn Kathir (164) covers ALL 6,236 ayahs with hadiths, stories, and historical context.
// Different from Ahsanul Bayaan (meaning explanation) — this has the backstories.
// Extracts concise opening (~800 chars). Cached in SQLite for offline.

import { useCallback, useState } from 'react';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';

export interface ContextData {
  verseKey: string;
  nuzulStory: string;
  source: string;
}

const IBN_KATHIR_BN_ID = 164;
const API_BASE = 'https://api.quran.com/api/v4';
const MAX_LENGTH = 800;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract concise opening paragraphs from Ibn Kathir */
function extractConcise(html: string): string {
  const clean = stripHtml(html);
  const paragraphs = clean.split('\n\n').filter(p => p.trim().length > 20);

  let result = '';
  for (const para of paragraphs) {
    if (result.length + para.length + 2 > MAX_LENGTH) {
      if (result.length === 0) {
        result = para.substring(0, MAX_LENGTH - 3) + '...';
      }
      break;
    }
    result += (result ? '\n\n' : '') + para;
  }
  return result || clean.substring(0, MAX_LENGTH);
}

export function useContextTafsir() {
  const { db } = useDatabaseContext();
  const [loading, setLoading] = useState(false);
  const [contextData, setContextData] = useState<ContextData | null>(null);

  const ensureTable = useCallback(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS context_cache (
        verse_key TEXT PRIMARY KEY,
        nuzul_story TEXT NOT NULL,
        source TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }, [db]);

  const fetchContext = useCallback(async (surahId: number, verseNumber: number): Promise<ContextData | null> => {
    const verseKey = `${surahId}:${verseNumber}`;
    setLoading(true);
    setContextData(null);

    try {
      await ensureTable();

      // 1. Check cache
      const cached = await db.getFirstAsync<{
        verse_key: string; nuzul_story: string; source: string;
      }>(
        'SELECT verse_key, nuzul_story, source FROM context_cache WHERE verse_key = ?',
        [verseKey]
      );

      if (cached) {
        const data: ContextData = {
          verseKey: cached.verse_key,
          nuzulStory: cached.nuzul_story,
          source: cached.source,
        };
        setContextData(data);
        setLoading(false);
        return data;
      }

      // 2. Fetch from Ibn Kathir Bengali (covers all ayahs)
      const url = `${API_BASE}/tafsirs/${IBN_KATHIR_BN_ID}/by_ayah/${verseKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        setLoading(false);
        return null;
      }

      const json = await response.json();
      const rawText: string = json?.tafsir?.text ?? '';

      if (!rawText) {
        setLoading(false);
        return null;
      }

      const concise = extractConcise(rawText);
      const source = 'তাফসীর ইবনে কাসীর';
      const data: ContextData = { verseKey, nuzulStory: concise, source };

      // Cache for offline
      await db.runAsync(
        'INSERT OR REPLACE INTO context_cache (verse_key, nuzul_story, source) VALUES (?, ?, ?)',
        [verseKey, concise, source]
      );

      setContextData(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('[ContextTafsir] error:', err);
      setLoading(false);
      return null;
    }
  }, [db, ensureTable]);

  return { loading, contextData, fetchContext };
}
