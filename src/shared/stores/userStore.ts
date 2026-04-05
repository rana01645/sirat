// src/shared/stores/userStore.ts
// Zustand store for user progress and profile

import { create } from 'zustand';

interface UserState {
  // Profile
  readingLevel: 'beginner' | 'intermediate' | 'advanced';
  dailyGoalType: 'ayahs' | 'minutes';
  dailyGoalValue: number;
  onboardingCompleted: boolean;

  // Progress
  lastSurahId: number;
  lastAyahId: number;
  totalAyahsRead: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;

  // Auth
  isAuthenticated: boolean;
  userId: string | null;

  // Actions
  setReadingLevel: (level: UserState['readingLevel']) => void;
  setDailyGoal: (type: UserState['dailyGoalType'], value: number) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  updateProgress: (surahId: number, ayahId: number, ayahsRead: number) => void;
  updateStreak: (streak: number, longest: number, lastDate: string) => void;
  setAuth: (userId: string | null) => void;
  hydrate: (state: Partial<UserState>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  readingLevel: 'beginner',
  dailyGoalType: 'ayahs',
  dailyGoalValue: 3,
  onboardingCompleted: false,

  lastSurahId: 1,
  lastAyahId: 1,
  totalAyahsRead: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,

  isAuthenticated: false,
  userId: null,

  setReadingLevel: (level) => set({ readingLevel: level }),
  setDailyGoal: (type, value) => set({ dailyGoalType: type, dailyGoalValue: value }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  updateProgress: (surahId, ayahId, ayahsRead) =>
    set((state) => ({
      lastSurahId: surahId,
      lastAyahId: ayahId,
      totalAyahsRead: state.totalAyahsRead + ayahsRead,
    })),
  updateStreak: (streak, longest, lastDate) =>
    set({ currentStreak: streak, longestStreak: longest, lastReadDate: lastDate }),
  setAuth: (userId) => set({ isAuthenticated: !!userId, userId }),
  hydrate: (state) => set(state),
}));
