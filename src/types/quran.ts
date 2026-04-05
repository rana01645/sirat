// src/types/quran.ts
// Strict TypeScript interfaces for Quranic data
// Flattened schema: Bengali translation embedded directly in Ayah (no JOINs)

/** Surah (chapter) metadata — maps to `surahs` SQLite table */
export interface Surah {
  id: number;
  name_arabic: string;
  name_bengali: string;
  revelation_place: string;
  verses_count: number;
}

/** Ayah (verse) with flattened Bengali translation — maps to `ayahs` SQLite table */
export interface Ayah {
  id: number;
  surah_id: number;
  verse_number: number;
  text_uthmani: string;
  text_bengali: string;
}

/** Tafsir entry — maps to `tafsirs` SQLite table */
export interface Tafsir {
  id: number;
  verse_key: string;
  surah_id: number;
  verse_number: number;
  text_bengali: string;
}

/** Vocabulary word — maps to `words` SQLite table */
export interface Word {
  id: number;
  arabic: string;
  root: string | null;
  bengali: string;
  english: string | null;
  frequency: number;
  rank: number;
}

/** Word occurrence in a specific ayah — maps to `word_occurrences` SQLite table */
export interface WordOccurrence {
  id: number;
  word_id: number;
  ayah_id: number;
  position: number;
}

/** Word with its ayah context (for display in word detail views) */
export interface WordInAyah {
  wordId: number;
  arabic: string;
  bengali: string;
  root: string | null;
  position: number;
}

/** Ayah with surah context (for "all ayahs containing this word" view) */
export interface AyahWithSurah extends Ayah {
  surah_name_arabic: string;
  surah_name_bengali: string;
}

// ----- Raw API response shapes (used only during seeding) -----

/** Raw surah object from Quran.com /v4/chapters */
export interface RawApiSurah {
  id: number;
  name_arabic: string;
  name_simple: string;
  name_complex: string;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  verses_count: number;
  pages: number[];
  translated_name: {
    language_name: string;
    name: string;
  };
}

/** Raw ayah from Quran.com /v4/quran/verses/uthmani */
export interface RawApiAyah {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

/** Raw translation from Quran.com /v4/quran/translations/161 */
export interface RawApiTranslation {
  resource_id: number;
  text: string;
}

/** Top-level API response wrappers */
export interface RawSurahsResponse {
  chapters: RawApiSurah[];
}

export interface RawAyahsResponse {
  verses: RawApiAyah[];
}

export interface RawTranslationsResponse {
  translations: RawApiTranslation[];
}
