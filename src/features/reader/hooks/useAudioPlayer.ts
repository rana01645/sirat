// src/features/reader/hooks/useAudioPlayer.ts
// Audio playback for Quran recitation
// Arabic: CDN streaming from cdn.islamic.network (20 reciters)
// Bengali: Local pre-generated Google Cloud TTS (Chirp3-HD Enceladus)

import { useCallback, useRef, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import type { Ayah } from '@/src/types/quran';

export type AudioMode = 'arabic' | 'bengali';
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

interface AudioPlayerState {
  playbackState: PlaybackState;
  currentAyahId: number | null;
  audioMode: AudioMode;
  isSequentialMode: boolean;
  audioProgress: number; // 0-1 progress through current ayah
}

// Available reciters (Arabic)
export const ARABIC_RECITERS = [
  { id: 'ar.alafasy', name: 'মিশারি আল-আফাসি', englishName: 'Mishary Alafasy', bitrate: 128 },
  { id: 'ar.abdulbasitmurattal', name: 'আব্দুল বাসিত', englishName: 'Abdul Basit', bitrate: 192 },
  { id: 'ar.husary', name: 'মাহমুদ আল-হুসারি', englishName: 'Husary', bitrate: 128 },
  { id: 'ar.minshawi', name: 'মিনশাওয়ি', englishName: 'Minshawi', bitrate: 128 },
  { id: 'ar.abdurrahmaansudais', name: 'সুদাইস', englishName: 'As-Sudais', bitrate: 128 },
  { id: 'ar.mahermuaiqly', name: 'মাহের আল-মুআইকলি', englishName: 'Maher Al Muaiqly', bitrate: 128 },
  { id: 'ar.saoodshuraym', name: 'সাউদ আশ-শুরাইম', englishName: 'Ash-Shuraym', bitrate: 128 },
  { id: 'ar.hudhaify', name: 'হুযাইফি', englishName: 'Hudhaify', bitrate: 128 },
] as const;

export type ReciterId = typeof ARABIC_RECITERS[number]['id'];

// Audio URL builder using cdn.islamic.network
// Format: https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{ayahNumber}.mp3
// ayahNumber is sequential (1-6236), NOT surah:verse format
// We need to convert surahId + verseNumber to sequential ayah number

// Cumulative verse counts per surah (index 0 = surah 1 start offset = 0)
const SURAH_OFFSETS = [
  0, 7, 293, 493, 669, 789, 954, 1160,
  1235, 1364, 1473, 1596, 1707, 1750, 1802, 1901,
  2029, 2140, 2250, 2348, 2483, 2595, 2673, 2791,
  2855, 2932, 3159, 3252, 3340, 3409, 3469, 3503,
  3533, 3606, 3660, 3705, 3788, 3970, 4058, 4133,
  4218, 4272, 4325, 4414, 4473, 4510, 4545, 4583,
  4612, 4630, 4675, 4735, 4784, 4846, 4901, 4979,
  5075, 5104, 5126, 5150, 5163, 5177, 5188, 5199,
  5217, 5229, 5241, 5271, 5323, 5375, 5419, 5447,
  5475, 5495, 5551, 5591, 5622, 5672, 5712, 5758,
  5800, 5829, 5848, 5884, 5909, 5931, 5948, 5967,
  5993, 6023, 6043, 6058, 6079, 6090, 6098, 6106,
  6125, 6130, 6138, 6146, 6157, 6168, 6176, 6179,
  6188, 6193, 6197, 6204, 6207, 6213, 6216, 6221,
  6225, 6230,
];

function getSequentialAyahNumber(surahId: number, verseNumber: number): number {
  return SURAH_OFFSETS[surahId - 1] + verseNumber;
}

function getArabicAudioUrl(edition: string, bitrate: number, surahId: number, verseNumber: number): string {
  const seqNum = getSequentialAyahNumber(surahId, verseNumber);
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${edition}/${seqNum}.mp3`;
}

// Bengali audio: pre-generated Google Cloud TTS (Chirp3-HD Enceladus)
// In dev: served by Metro bundler from assets/ directory
// In prod: host on CDN and update this base URL
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getBengaliAudioBaseUrl(): string {
  // In dev mode, Metro serves assets at the dev server URL
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:8081/assets/assets/audio/bn-translation-gcloud`;
  }
  // Production: hosted on sirat.bd CDN
  return 'https://sirat.bd/audio/bn';
}

function getBengaliAudioUri(surahId: number, verseNumber: number): string {
  const seqNum = getSequentialAyahNumber(surahId, verseNumber);
  return `${getBengaliAudioBaseUrl()}/${seqNum}.mp3`;
}

export function useAudioPlayer(ayahs: Ayah[]) {
  const [state, setState] = useState<AudioPlayerState>({
    playbackState: 'idle',
    currentAyahId: null,
    audioMode: 'arabic',
    isSequentialMode: false,
    audioProgress: 0,
  });

  const [arabicReciter, setArabicReciterState] = useState<ReciterId>('ar.alafasy');
  const soundRef = useRef<Audio.Sound | null>(null);
  const sequentialIndexRef = useRef<number>(-1);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);
  const audioModeRef = useRef<AudioMode>('arabic');

  useEffect(() => {
    isMountedRef.current = true;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

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

  const safeSetState = useCallback((update: Partial<AudioPlayerState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...update }));
    }
  }, []);

  // Play an MP3 from URL (Arabic CDN or Bengali local/CDN)
  const playAudioFile = useCallback(async (ayah: Ayah, mode: AudioMode): Promise<boolean> => {
    await cleanup();
    if (isStoppingRef.current) return false;

    let url: string;
    if (mode === 'arabic') {
      const reciter = ARABIC_RECITERS.find(r => r.id === arabicReciter) ?? ARABIC_RECITERS[0];
      url = getArabicAudioUrl(reciter.id, reciter.bitrate, ayah.surah_id, ayah.verse_number);
    } else {
      url = getBengaliAudioUri(ayah.surah_id, ayah.verse_number);
    }

    safeSetState({ playbackState: 'loading', currentAyahId: ayah.id, audioProgress: 0 });

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 100 },
      );
      soundRef.current = sound;
      safeSetState({ playbackState: 'playing' });

      return new Promise<boolean>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!isMountedRef.current || isStoppingRef.current) {
            resolve(false);
            return;
          }
          if (status.isLoaded) {
            // Update progress
            if (status.durationMillis && status.durationMillis > 0) {
              const progress = status.positionMillis / status.durationMillis;
              safeSetState({ audioProgress: Math.min(progress, 1) });
            }
            if (status.didJustFinish) {
              safeSetState({ playbackState: 'idle', currentAyahId: null, audioProgress: 0 });
              resolve(true);
            }
          }
        });
      });
    } catch {
      safeSetState({ playbackState: 'idle', currentAyahId: null, audioProgress: 0 });
      return false;
    }
  }, [cleanup, safeSetState, arabicReciter]);

  // Play a single ayah in the current mode
  const playAyah = useCallback(async (ayah: Ayah, mode?: AudioMode) => {
    const m = mode ?? audioModeRef.current;
    isStoppingRef.current = false;
    safeSetState({ audioMode: m, isSequentialMode: false, audioProgress: 0 });
    await playAudioFile(ayah, m);
  }, [playAudioFile, safeSetState]);

  // Play sequentially from a given ayah through the rest of the surah
  const playSequential = useCallback(async (startAyah: Ayah, mode?: AudioMode) => {
    const m = mode ?? audioModeRef.current;
    isStoppingRef.current = false;
    safeSetState({ audioMode: m, isSequentialMode: true });

    const startIdx = ayahs.findIndex(a => a.id === startAyah.id);
    if (startIdx === -1) return;

    sequentialIndexRef.current = startIdx;

    for (let i = startIdx; i < ayahs.length; i++) {
      if (isStoppingRef.current || !isMountedRef.current) break;
      sequentialIndexRef.current = i;
      const ok = await playAudioFile(ayahs[i], m);
      if (!ok) break;
    }

    if (isMountedRef.current) {
      safeSetState({ playbackState: 'idle', currentAyahId: null, isSequentialMode: false, audioProgress: 0 });
    }
  }, [ayahs, playAudioFile, safeSetState]);

  // Pause/resume
  const togglePause = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      safeSetState({ playbackState: 'paused' });
    } else {
      await soundRef.current.playAsync();
      safeSetState({ playbackState: 'playing' });
    }
  }, [safeSetState]);

  // Stop completely
  const stop = useCallback(async () => {
    isStoppingRef.current = true;
    await cleanup();
    safeSetState({ playbackState: 'idle', currentAyahId: null, isSequentialMode: false, audioProgress: 0 });
  }, [cleanup, safeSetState]);

  // Change audio mode
  const setAudioMode = useCallback((mode: AudioMode) => {
    audioModeRef.current = mode;
    safeSetState({ audioMode: mode });
  }, [safeSetState]);

  // Change Arabic reciter
  const setArabicReciter = useCallback((id: ReciterId) => {
    setArabicReciterState(id);
  }, []);

  return {
    ...state,
    arabicReciter,
    playAyah,
    playSequential,
    togglePause,
    stop,
    setAudioMode,
    setArabicReciter,
  };
}
