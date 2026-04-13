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
  meaningBengali: string;
  motivationText: string;
  motivationTextBengali: string;
  icon: string; // Ionicons name
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
    meaningBengali:
      'প্রেমিক / ভালোবাসার অন্বেষণকারী। মুহিব হলেন সেই ব্যক্তি যার যাত্রা শুরু হয় একটি পবিত্র হৃদয় দিয়ে। আপনি হয়তো এখনও আরবি জানেন না বা গভীর তাফসীর বোঝেন না, কিন্তু আপনার হৃদয়ে আল্লাহর বাণীর প্রতি আন্তরিক ভালোবাসা রয়েছে। এই পদমর্যাদা আপনার নিয়ত ও সংযোগের আকাঙ্ক্ষাকে সম্মান জানায়।',
    motivationText:
      'Every great scholar started as a Muhib. Your love for the Quran has ignited the light. Keep reading to grow your understanding.',
    motivationTextBengali:
      'প্রতিটি মহান আলেমের যাত্রা শুরু হয়েছিল একজন মুহিব হিসেবে। কুরআনের প্রতি আপনার ভালোবাসা আলো জ্বালিয়ে দিয়েছে। বুঝ বাড়াতে পড়তে থাকুন।',
    icon: 'heart',
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
    meaningBengali:
      'সক্রিয় শিক্ষার্থী / ছাত্র। একজন মুতাআল্লিম নিষ্ক্রিয় ভালোবাসা থেকে সক্রিয় প্রচেষ্টায় উত্তীর্ণ হয়েছেন। আপনি আর শুধু শুনছেন না; আপনি অধ্যয়ন করছেন। প্রতিদিনের ধারা বজায় রেখে এবং বাংলা অনুবাদ পড়ে আপনি আপনার সৃষ্টিকর্তার বার্তা বুঝতে সক্রিয়ভাবে চেষ্টা করছেন।',
    motivationText:
      'You are now a Mutallim. You are putting in the daily work to turn your recitation into true comprehension. The path of knowledge is opening up for you.',
    motivationTextBengali:
      'আপনি এখন একজন মুতাআল্লিম। আপনি প্রতিদিন পরিশ্রম করে তিলাওয়াতকে প্রকৃত বোধে পরিণত করছেন। জ্ঞানের পথ আপনার জন্য উন্মুক্ত হচ্ছে।',
    icon: 'book',
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
    meaningBengali:
      'যিনি বোঝেন / গভীর চিন্তাবিদ। ফাহীম হওয়া মানে গভীর উপলব্ধি ও অন্তর্দৃষ্টির অধিকারী হওয়া। কুরআন আর আপনার কাছে অপরিচিত কোনো গ্রন্থ নয়। আপনি ঐতিহাসিক প্রেক্ষাপট (আসবাবুন নুযূল) বুঝছেন, তাদাব্বুর (গভীর চিন্তা) করছেন এবং মূল শব্দভাণ্ডার আয়ত্ত করছেন।',
    motivationText:
      "Masha'Allah, you have reached the rank of Fahim. The Quran is no longer just words on a page; it is a clear guide that you understand and reflect upon daily.",
    motivationTextBengali:
      'মাশাআল্লাহ, আপনি ফাহীম পদমর্যাদায় পৌঁছেছেন। কুরআন আর শুধু পাতার অক্ষর নয়; এটি একটি স্পষ্ট পথনির্দেশ যা আপনি প্রতিদিন বোঝেন ও চিন্তা করেন।',
    icon: 'bulb',
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
    meaningBengali:
      'কুরআনের সঙ্গী। এটি সর্বোচ্চ আধ্যাত্মিক সম্মান, যা সরাসরি হাদীসে উল্লেখিত। সঙ্গী হলেন তিনি যিনি সর্বদা আপনার সাথে থাকেন। কুরআন আপনার আনন্দ, উদ্বেগ ও সিদ্ধান্তের মুহূর্তে অবিচ্ছেদ্য সাথী হয়ে উঠেছে। আপনার অভ্যাস দৃঢ়, উপলব্ধি গভীর, এবং কুরআনের আলো (নূর) এখন আপনার দৈনন্দিন চরিত্রে প্রতিফলিত হচ্ছে।',
    motivationText:
      "You are a Sahib al-Quran. The Book of Allah has become your closest companion in this life, and Insha'Allah, it will be your advocate in the next.",
    motivationTextBengali:
      'আপনি একজন সাহিবুল কুরআন। আল্লাহর কিতাব এই জীবনে আপনার নিকটতম সঙ্গী হয়ে উঠেছে, এবং ইনশাআল্লাহ, পরকালে এটি আপনার সুপারিশকারী হবে।',
    icon: 'star',
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
