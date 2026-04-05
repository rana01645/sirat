// src/shared/types/database.ts
// SQLite schema types for the offline-first Quran app
// Re-exports core Quran types and defines app-specific tables

export type { Surah, Ayah } from '@/src/types/quran';

export interface UserProgress {
  id: number;
  last_surah_id: number;
  last_ayah_id: number;
  daily_goal_type: 'ayahs' | 'minutes';
  daily_goal_value: number;
  reading_level: 'beginner' | 'intermediate' | 'advanced';
  total_ayahs_read: number;
  current_streak: number;
  longest_streak: number;
  last_read_date: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: number;
  ayah_id: number;
  surah_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GamificationState {
  id: number;
  ilm_coins: number;
  nur_level: number;
  unlocked_themes: string;
  unlocked_reciters: string;
  active_theme: string;
  quizzes_completed: number;
  last_quiz_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: number;
  date: string;
  ayahs_read: number;
  coins_earned: number;
  quiz_score: number | null;
  completed_goal: boolean;
}
