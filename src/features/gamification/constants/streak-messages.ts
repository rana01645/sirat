// src/features/gamification/constants/streak-messages.ts
// Guilt-free, encouraging messages — never punitive

export interface StreakMessage {
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
}

/** Shown when the user has an active streak */
export function getActiveStreakMessage(days: number): StreakMessage {
  if (days >= 30) {
    return {
      title: 'SubhanAllah — A month of light!',
      titleBn: 'সুবহানাল্লাহ — আলোর এক মাস!',
      body: `${days} days of connection with the Quran. Your Nur shines brilliantly.`,
      bodyBn: `${days} দিন কুরআনের সাথে সংযোগ। আপনার নূর উজ্জ্বলভাবে জ্বলছে।`,
    };
  }
  if (days >= 7) {
    return {
      title: 'Masha\'Allah — Keep going!',
      titleBn: 'মাশাআল্লাহ — চালিয়ে যান!',
      body: `${days} beautiful days in a row. Each day adds warmth to your light.`,
      bodyBn: `${days}টি সুন্দর দিন পরপর। প্রতিটি দিন আপনার আলোতে উষ্ণতা যোগ করে।`,
    };
  }
  return {
    title: 'Your light is growing',
    titleBn: 'আপনার আলো বাড়ছে',
    body: `${days} day${days === 1 ? '' : 's'} of reading. Every ayah is a seed of understanding.`,
    bodyBn: `${days} দিনের পড়া। প্রতিটি আয়াত বোঝার একটি বীজ।`,
  };
}

/** Shown when the user has broken a streak — always gentle and welcoming */
export function getBrokenStreakMessage(previousStreak: number): StreakMessage {
  if (previousStreak === 0) {
    return {
      title: 'Welcome — your journey starts now',
      titleBn: 'স্বাগতম — আপনার যাত্রা এখন শুরু',
      body: 'The Quran has been waiting for you. Even one ayah today is a beautiful beginning.',
      bodyBn: 'কুরআন আপনার জন্য অপেক্ষা করছিল। আজ একটি আয়াতও একটি সুন্দর শুরু।',
    };
  }
  return {
    title: 'Welcome back — the door is always open',
    titleBn: 'ফিরে আসায় স্বাগতম — দরজা সবসময় খোলা',
    body: `You had a wonderful ${previousStreak}-day streak. Life happens, and that's okay. The Quran is here whenever you are ready. Pick up where you left off.`,
    bodyBn: `আপনার ${previousStreak} দিনের চমৎকার ধারাবাহিকতা ছিল। জীবনে এমন হয়, কোনো সমস্যা নেই। আপনি প্রস্তুত হলেই কুরআন এখানে আছে। যেখানে ছিলেন সেখান থেকে শুরু করুন।`,
  };
}
