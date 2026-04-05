# সিরাত — Sirat (صراط) The Path

A universal (iOS, Android, Web) Quran app designed to help Bengali speakers not just recite, but truly **understand** the Quran.

## Why Sirat?

Millions of Bengali speakers recite the Quran daily without understanding a single word. Sirat changes that with bite-sized verses, modern Bengali translations, and a gentle gamification system driven entirely by intrinsic motivation — no ads, no subscriptions, no paywalls.

## Features

📖 **Distraction-free Reader** — Uthmani Arabic with Bengali translation, surah-by-surah navigation, and word-by-word tap-to-learn

🎯 **Daily Bite** — Micro-habit system serving verses matched to your daily goal

🕌 **শানে নুযূল** — Revelation backstories from Ibn Kathir, cached offline

📝 **Tadabbur Journal** — Private reflections saved locally per ayah

🔤 **Vocabulary Builder** — 800+ most frequent Quranic words with audio pronunciation, covering 80%+ of the Quran

🎧 **Ayah-by-Ayah Audio** — Stream or listen to word-level recitations from Quran.com CDN

💡 **Emotion Discovery** — Feeling anxious, grateful, or sad? Get curated verses with Bengali context

🏆 **Intrinsic Gamification** — Ilm Coins, Nur (Light) streak system, ranks (Seeker → Scholar), and aesthetic unlocks

## Tech Stack

- **Framework:** React Native + Expo (Expo Router)
- **Database:** expo-sqlite (offline-first, all data stored locally)
- **State:** Zustand
- **Architecture:** Feature-Sliced Design
- **Language:** Strict TypeScript
- **Audio:** Quran.com CDN (77,430 word pronunciations)
- **Tafsir:** Quran.com API (Ahsanul Bayaan + Ibn Kathir Bengali)

## Getting Started

```bash
git clone https://github.com/rana01645/sirat.git
cd sirat
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android, or `w` for web.

## Project Structure

```
src/
├── features/
│   ├── reader/          # Quran reader, tafsir, notes, context cards
│   ├── gamification/    # Nur lantern, ranks, coins, daily progress
│   ├── discovery/       # Emotion-driven verse recommendations
│   └── vocabulary/      # Word-by-word learning, audio pronunciation
├── shared/
│   ├── components/      # Reusable UI (BottomSheet, FadeIn, MixedText)
│   ├── providers/       # Database, auth providers
│   ├── stores/          # Zustand stores
│   └── lib/             # Theme, database, utilities
└── types/               # TypeScript interfaces
```

## Contributing

Contributions welcome! Whether it's improving Bengali translations, adding new tafsir sources, fixing bugs, or suggesting features — every contribution helps someone understand Allah's message better.

## License

MIT
