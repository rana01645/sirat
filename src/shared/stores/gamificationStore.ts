// src/shared/stores/gamificationStore.ts
// Zustand store for the intrinsic gamification loop.
// Manages: Ilm Coins, Nur (streak glow), Ranks, Daily Progress.
// All state persisted to SQLite via hydrate/persist methods.

import { create } from 'zustand';
import { getCurrentRank, getNextRank, getProgressToNextRank } from '@/src/features/gamification/constants/ranks';
import type { Rank } from '@/src/features/gamification/constants/ranks';

// Coin reward amounts
export const COIN_REWARDS = {
  DAILY_GOAL_COMPLETE: 10,
  TAFSIR_READ: 5,
  NOTE_WRITTEN: 3,
  AYAH_READ: 1,
} as const;

interface DailyProgress {
  date: string; // YYYY-MM-DD
  ayahsRead: number;
  goalTarget: number;
  goalCompleted: boolean;
  coinsEarned: number;
  tafsirsRead: number;
  notesWritten: number;
}

interface GamificationState {
  // Core state
  ilmCoins: number;
  nurLevel: number; // 1-10
  currentStreak: number;
  longestStreak: number;
  totalAyahsRead: number;
  totalSessions: number;
  lastSessionDate: string | null;

  // Today's progress
  dailyProgress: DailyProgress;
  dailyGoalAyahs: number;

  // Theming
  unlockedThemes: string[];
  activeTheme: string;

  // Derived
  currentRank: Rank;
  nextRank: Rank | null;
  progressToNextRank: number;

  // Actions
  addCoins: (amount: number, reason: string) => void;
  markAyahRead: () => void;
  markTafsirRead: () => void;
  markNoteWritten: () => void;
  completeDailyGoal: () => void;
  updateStreak: (today: string) => void;
  setDailyGoal: (count: number) => void;
  hydrate: (state: Partial<GamificationState>) => void;
  resetDailyIfNeeded: (today: string) => void;
}

function deriveRankFields(coins: number) {
  return {
    currentRank: getCurrentRank(coins),
    nextRank: getNextRank(coins),
    progressToNextRank: getProgressToNextRank(coins),
  };
}

function calcNurLevel(streak: number): number {
  // Streak 0 = level 1 (dim), streak 10+ = level 10 (max glow)
  return Math.max(1, Math.min(10, streak));
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function emptyDailyProgress(goalTarget: number): DailyProgress {
  return {
    date: todayStr(),
    ayahsRead: 0,
    goalTarget,
    goalCompleted: false,
    coinsEarned: 0,
    tafsirsRead: 0,
    notesWritten: 0,
  };
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  ilmCoins: 0,
  nurLevel: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalAyahsRead: 0,
  totalSessions: 0,
  lastSessionDate: null,
  dailyGoalAyahs: 3,
  dailyProgress: emptyDailyProgress(3),
  unlockedThemes: ['default'],
  activeTheme: 'default',
  ...deriveRankFields(0),

  addCoins: (amount, _reason) =>
    set((state) => {
      const newCoins = state.ilmCoins + amount;
      const dp = { ...state.dailyProgress, coinsEarned: state.dailyProgress.coinsEarned + amount };
      return { ilmCoins: newCoins, dailyProgress: dp, ...deriveRankFields(newCoins) };
    }),

  markAyahRead: () =>
    set((state) => {
      const newTotal = state.totalAyahsRead + 1;
      const dp = { ...state.dailyProgress, ayahsRead: state.dailyProgress.ayahsRead + 1 };
      const newCoins = state.ilmCoins + COIN_REWARDS.AYAH_READ;
      dp.coinsEarned += COIN_REWARDS.AYAH_READ;
      return {
        totalAyahsRead: newTotal,
        ilmCoins: newCoins,
        dailyProgress: dp,
        ...deriveRankFields(newCoins),
      };
    }),

  markTafsirRead: () =>
    set((state) => {
      const dp = { ...state.dailyProgress, tafsirsRead: state.dailyProgress.tafsirsRead + 1 };
      const newCoins = state.ilmCoins + COIN_REWARDS.TAFSIR_READ;
      dp.coinsEarned += COIN_REWARDS.TAFSIR_READ;
      return { ilmCoins: newCoins, dailyProgress: dp, ...deriveRankFields(newCoins) };
    }),

  markNoteWritten: () =>
    set((state) => {
      const dp = { ...state.dailyProgress, notesWritten: state.dailyProgress.notesWritten + 1 };
      const newCoins = state.ilmCoins + COIN_REWARDS.NOTE_WRITTEN;
      dp.coinsEarned += COIN_REWARDS.NOTE_WRITTEN;
      return { ilmCoins: newCoins, dailyProgress: dp, ...deriveRankFields(newCoins) };
    }),

  completeDailyGoal: () =>
    set((state) => {
      if (state.dailyProgress.goalCompleted) return state;
      const newCoins = state.ilmCoins + COIN_REWARDS.DAILY_GOAL_COMPLETE;
      const newStreak = state.currentStreak + 1;
      const newLongest = Math.max(state.longestStreak, newStreak);
      const dp = {
        ...state.dailyProgress,
        goalCompleted: true,
        coinsEarned: state.dailyProgress.coinsEarned + COIN_REWARDS.DAILY_GOAL_COMPLETE,
      };
      return {
        ilmCoins: newCoins,
        currentStreak: newStreak,
        longestStreak: newLongest,
        nurLevel: calcNurLevel(newStreak),
        totalSessions: state.totalSessions + 1,
        lastSessionDate: todayStr(),
        dailyProgress: dp,
        ...deriveRankFields(newCoins),
      };
    }),

  updateStreak: (today) =>
    set((state) => {
      if (!state.lastSessionDate) return state;
      const last = new Date(state.lastSessionDate);
      const now = new Date(today);
      const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        // Streak broken — dim the nur
        return { currentStreak: 0, nurLevel: 1 };
      }
      return state;
    }),

  setDailyGoal: (count) =>
    set((state) => ({
      dailyGoalAyahs: count,
      dailyProgress: { ...state.dailyProgress, goalTarget: count },
    })),

  resetDailyIfNeeded: (today) =>
    set((state) => {
      if (state.dailyProgress.date !== today) {
        return { dailyProgress: emptyDailyProgress(state.dailyGoalAyahs) };
      }
      return state;
    }),

  hydrate: (incoming) =>
    set((state) => {
      const merged = { ...state, ...incoming };
      return {
        ...merged,
        nurLevel: calcNurLevel(merged.currentStreak),
        ...deriveRankFields(merged.ilmCoins),
      };
    }),
}));
