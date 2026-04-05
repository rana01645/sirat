// src/shared/stores/readerStore.ts
// Zustand store for the core Quran reader state

import { create } from 'zustand';

interface ReaderState {
  // Current reading position
  currentSurahId: number;
  currentAyahNumber: number;

  // Display settings
  arabicFontSize: number;
  bengaliFontSize: number;
  showTransliteration: boolean;
  showTafsir: boolean;

  // Audio
  isPlaying: boolean;
  currentAudioAyahId: number | null;

  // Actions
  setPosition: (surahId: number, ayahNumber: number) => void;
  setArabicFontSize: (size: number) => void;
  setBengaliFontSize: (size: number) => void;
  toggleTransliteration: () => void;
  toggleTafsir: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentAudioAyah: (ayahId: number | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  currentSurahId: 1,
  currentAyahNumber: 1,

  arabicFontSize: 28,
  bengaliFontSize: 16,
  showTransliteration: false,
  showTafsir: false,

  isPlaying: false,
  currentAudioAyahId: null,

  setPosition: (surahId, ayahNumber) =>
    set({ currentSurahId: surahId, currentAyahNumber: ayahNumber }),
  setArabicFontSize: (size) => set({ arabicFontSize: size }),
  setBengaliFontSize: (size) => set({ bengaliFontSize: size }),
  toggleTransliteration: () => set((s) => ({ showTransliteration: !s.showTransliteration })),
  toggleTafsir: () => set((s) => ({ showTafsir: !s.showTafsir })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentAudioAyah: (ayahId) => set({ currentAudioAyahId: ayahId }),
}));
