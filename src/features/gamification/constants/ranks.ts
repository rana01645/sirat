// src/features/gamification/constants/ranks.ts
// The four-tier spiritual rank system

export interface Rank {
  id: string;
  titleArabic: string;
  titleBengali: string;
  titleEnglish: string;
  minCoins: number;
  maxCoins: number | null; // null = no upper limit
  meaning: string;
  motivationText: string;
}

export const RANKS: readonly Rank[] = [
  {
    id: 'muhib',
    titleArabic: 'مُحِبّ',
    titleBengali: 'মুহিব',
    titleEnglish: 'Muhib',
    minCoins: 0,
    maxCoins: 499,
    meaning:
      'The Lover / The Affectionate Seeker. A Muhib is someone whose journey begins with a pure heart. You may not yet know Arabic or understand the deep Tafsir, but you possess a sincere love for the words of Allah. This rank honors your intention and your desire to connect.',
    motivationText:
      'Every great scholar started as a Muhib. Your love for the Quran has ignited the light. Keep reading to grow your understanding.',
  },
  {
    id: 'mutallim',
    titleArabic: 'مُتَعَلِّم',
    titleBengali: 'মুতাআল্লিম',
    titleEnglish: 'Mutallim',
    minCoins: 500,
    maxCoins: 1999,
    meaning:
      'The Active Learner / The Student. A Mutallim has transitioned from passive love to active effort. You are no longer just listening; you are studying. By building your daily streak and reading the Bengali translations, you are actively striving to understand your Creator\'s message.',
    motivationText:
      'You are now a Mutallim. You are putting in the daily work to turn your recitation into true comprehension. The path of knowledge is opening up for you.',
  },
  {
    id: 'fahim',
    titleArabic: 'فَهِيم',
    titleBengali: 'ফাহীম',
    titleEnglish: 'Fahim',
    minCoins: 2000,
    maxCoins: 4999,
    meaning:
      'The One Who Understands / The Deep Thinker. To be Fahim means to possess deep comprehension and insight. The Quran is no longer a foreign text to you. You are grasping the historical context (Asbab al-Nuzul), engaging in Tadabbur (reflection), and understanding the core vocabulary.',
    motivationText:
      "Masha'Allah, you have reached the rank of Fahim. The Quran is no longer just words on a page; it is a clear guide that you understand and reflect upon daily.",
  },
  {
    id: 'sahib-al-quran',
    titleArabic: 'صَاحِبُ الْقُرْآنِ',
    titleBengali: 'সাহিবুল কুরআন',
    titleEnglish: 'Sahib al-Quran',
    minCoins: 5000,
    maxCoins: null,
    meaning:
      "The Companion of the Quran. This is the highest spiritual honor, referenced directly in the Hadith. A Companion is someone who is always with you. The Quran has become your constant friend in times of joy, anxiety, and decision-making. Your habits are solidified, your understanding is deep, and the Quran's light (Nur) now reflects in your daily character.",
    motivationText:
      "You are a Sahib al-Quran. The Book of Allah has become your closest companion in this life, and Insha'Allah, it will be your advocate in the next.",
  },
] as const;

export function getCurrentRank(ilmCoins: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (ilmCoins >= RANKS[i].minCoins) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(ilmCoins: number): Rank | null {
  const current = getCurrentRank(ilmCoins);
  const currentIndex = RANKS.findIndex((r) => r.id === current.id);
  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1];
  }
  return null;
}

export function getProgressToNextRank(ilmCoins: number): number {
  const current = getCurrentRank(ilmCoins);
  const next = getNextRank(ilmCoins);
  if (!next) return 1; // already at max rank
  const range = next.minCoins - current.minCoins;
  const progress = ilmCoins - current.minCoins;
  return Math.min(progress / range, 1);
}
