// useWordAudio — Play individual Quranic word pronunciation
// Source: https://audio.qurancdn.com/wbw/{surah}_{ayah}_{word}.mp3
// No DB dependency — caller provides word location or we do the lookup via passed-in db.

import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import type { AppDatabase } from '@/src/shared/lib/database';

type WordAudioState = 'idle' | 'loading' | 'playing';

function padThree(n: number): string {
  return String(n).padStart(3, '0');
}

function getWordAudioUrl(surahId: number, verseNumber: number, wordPosition: number): string {
  return `https://audio.qurancdn.com/wbw/${padThree(surahId)}_${padThree(verseNumber)}_${padThree(wordPosition)}.mp3`;
}

/** Lightweight audio hook — no context providers needed. Pass db explicitly for word-id lookups. */
export function useWordAudio(db?: AppDatabase) {
  const [audioState, setAudioState] = useState<WordAudioState>('idle');
  const [playingWordId, setPlayingWordId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
  }, []);

  const playFromUrl = useCallback(async (url: string, wordId: number | null) => {
    await cleanup();
    setAudioState('loading');
    setPlayingWordId(wordId);

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setAudioState('playing');

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setAudioState('idle');
          setPlayingWordId(null);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch {
      setAudioState('idle');
      setPlayingWordId(null);
    }
  }, [cleanup]);

  // Play by word_id — needs db to look up first occurrence
  const playWord = useCallback(async (wordId: number) => {
    if (!db) return;
    try {
      const row = await db.getFirstAsync<{
        surah_id: number;
        verse_number: number;
        position: number;
      }>(
        `SELECT a.surah_id, a.verse_number, wo.position
         FROM word_occurrences wo
         JOIN ayahs a ON a.id = wo.ayah_id
         WHERE wo.word_id = ?
         LIMIT 1`,
        [wordId]
      );
      if (!row) return;
      const url = getWordAudioUrl(row.surah_id, row.verse_number, row.position);
      await playFromUrl(url, wordId);
    } catch {
      setAudioState('idle');
      setPlayingWordId(null);
    }
  }, [db, playFromUrl]);

  // Play with known location — no DB needed
  const playWordDirect = useCallback(async (
    surahId: number,
    verseNumber: number,
    wordPosition: number,
    wordId?: number,
  ) => {
    const url = getWordAudioUrl(surahId, verseNumber, wordPosition);
    await playFromUrl(url, wordId ?? null);
  }, [playFromUrl]);

  const stopWord = useCallback(async () => {
    await cleanup();
    setAudioState('idle');
    setPlayingWordId(null);
  }, [cleanup]);

  return {
    audioState,
    playingWordId,
    playWord,
    playWordDirect,
    stopWord,
  };
}
