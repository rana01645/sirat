// Curated verse mappings for emotion-driven discovery.
// Each emotion maps to verse keys (surah:ayah) with a short Bengali context line.

export interface EmotionVerse {
  verseKey: string; // e.g. "2:286"
  contextBn: string;
}

export interface Emotion {
  id: string;
  labelBn: string;
  labelEn: string;
  icon: string;
  color: string;
  verses: EmotionVerse[];
}

export const EMOTIONS: Emotion[] = [
  {
    id: 'anxious',
    labelBn: 'উদ্বিগ্ন',
    labelEn: 'Anxious',
    icon: 'cloud-outline',
    color: '#7BA7C9',
    verses: [
      { verseKey: '2:286', contextBn: 'আল্লাহ কাউকে তার সাধ্যের বাইরে দায়িত্ব দেন না।' },
      { verseKey: '94:5', contextBn: 'কষ্টের সাথে স্বস্তি আছে।' },
      { verseKey: '94:6', contextBn: 'নিশ্চয়ই কষ্টের সাথে স্বস্তি আছে।' },
      { verseKey: '3:139', contextBn: 'তোমরা দুর্বল হয়ো না এবং দুঃখিত হয়ো না।' },
      { verseKey: '13:28', contextBn: 'আল্লাহর স্মরণে হৃদয় প্রশান্ত হয়।' },
      { verseKey: '65:3', contextBn: 'যে আল্লাহর উপর ভরসা করে, তিনি তার জন্য যথেষ্ট।' },
    ],
  },
  {
    id: 'sad',
    labelBn: 'দুঃখিত',
    labelEn: 'Sad',
    icon: 'water-outline',
    color: '#6B8FAD',
    verses: [
      { verseKey: '12:86', contextBn: 'আমি আমার দুঃখ ও বেদনা শুধু আল্লাহর কাছে জানাই।' },
      { verseKey: '93:3', contextBn: 'তোমার প্রতিপালক তোমাকে পরিত্যাগ করেননি।' },
      { verseKey: '2:155', contextBn: 'আমি তোমাদের পরীক্ষা করব ভয়, ক্ষুধা ও ধন-সম্পদের ক্ষতি দিয়ে।' },
      { verseKey: '39:53', contextBn: 'আল্লাহর রহমত থেকে নিরাশ হয়ো না।' },
      { verseKey: '93:5', contextBn: 'তোমার প্রতিপালক তোমাকে দেবেন এবং তুমি সন্তুষ্ট হবে।' },
    ],
  },
  {
    id: 'grateful',
    labelBn: 'কৃতজ্ঞ',
    labelEn: 'Grateful',
    icon: 'heart-outline',
    color: '#8DB580',
    verses: [
      { verseKey: '14:7', contextBn: 'যদি কৃতজ্ঞ হও, আমি অবশ্যই তোমাদের বাড়িয়ে দেব।' },
      { verseKey: '55:13', contextBn: 'তোমরা তোমাদের প্রতিপালকের কোন নিয়ামতকে অস্বীকার করবে?' },
      { verseKey: '31:12', contextBn: 'আল্লাহর প্রতি কৃতজ্ঞ হও।' },
      { verseKey: '2:152', contextBn: 'তোমরা আমাকে স্মরণ করো, আমি তোমাদের স্মরণ করব।' },
      { verseKey: '16:18', contextBn: 'তোমরা আল্লাহর নিয়ামত গুনে শেষ করতে পারবে না।' },
    ],
  },
  {
    id: 'lonely',
    labelBn: 'একাকী',
    labelEn: 'Lonely',
    icon: 'person-outline',
    color: '#A08BBB',
    verses: [
      { verseKey: '2:186', contextBn: 'আমি নিকটে। আমি প্রার্থনাকারীর প্রার্থনায় সাড়া দিই।' },
      { verseKey: '57:4', contextBn: 'তিনি তোমাদের সাথে আছেন যেখানেই তোমরা থাক।' },
      { verseKey: '9:40', contextBn: 'চিন্তা করো না, আল্লাহ আমাদের সাথে আছেন।' },
      { verseKey: '50:16', contextBn: 'আমি তার গলার শিরা থেকেও নিকটে।' },
      { verseKey: '29:69', contextBn: 'যারা আমার পথে চেষ্টা করে, আমি তাদের পথ দেখাই।' },
    ],
  },
  {
    id: 'frustrated',
    labelBn: 'হতাশ',
    labelEn: 'Frustrated',
    icon: 'thunderstorm-outline',
    color: '#C4724B',
    verses: [
      { verseKey: '3:200', contextBn: 'ধৈর্য ধরো, দৃঢ় থাকো এবং আল্লাহকে ভয় করো।' },
      { verseKey: '2:153', contextBn: 'ধৈর্য ও সালাতের মাধ্যমে সাহায্য প্রার্থনা করো।' },
      { verseKey: '90:4', contextBn: 'আমি মানুষকে কষ্টের মধ্যে সৃষ্টি করেছি।' },
      { verseKey: '42:43', contextBn: 'যে ধৈর্য ধরে ও ক্ষমা করে, এটা দৃঢ়সংকল্পের কাজ।' },
      { verseKey: '94:5', contextBn: 'কষ্টের সাথে স্বস্তি আছে।' },
    ],
  },
  {
    id: 'hopeful',
    labelBn: 'আশাবাদী',
    labelEn: 'Hopeful',
    icon: 'sunny-outline',
    color: '#D4A843',
    verses: [
      { verseKey: '12:87', contextBn: 'আল্লাহর রহমত থেকে নিরাশ হয়ো না।' },
      { verseKey: '65:2', contextBn: 'যে আল্লাহকে ভয় করে, তিনি তার জন্য পথ বের করে দেন।' },
      { verseKey: '2:216', contextBn: 'হয়তো তোমরা কিছু অপছন্দ করো কিন্তু তা তোমাদের জন্য কল্যাণকর।' },
      { verseKey: '39:53', contextBn: 'আল্লাহর রহমত থেকে নিরাশ হয়ো না।' },
      { verseKey: '93:4', contextBn: 'পরবর্তী জীবন তোমার জন্য পূর্ববর্তীর চেয়ে উত্তম।' },
    ],
  },
  {
    id: 'lost',
    labelBn: 'দিশেহারা',
    labelEn: 'Lost',
    icon: 'compass-outline',
    color: '#8B7355',
    verses: [
      { verseKey: '1:6', contextBn: 'আমাদের সরল পথ দেখাও।' },
      { verseKey: '6:122', contextBn: 'যে মৃত ছিল, আমি তাকে জীবন দিয়েছি এবং নূর দিয়েছি।' },
      { verseKey: '93:7', contextBn: 'তিনি তোমাকে পথহারা পেয়েছিলেন, তারপর পথ দেখিয়েছেন।' },
      { verseKey: '29:69', contextBn: 'যারা আমার পথে চেষ্টা করে, আমি তাদের পথ দেখাই।' },
      { verseKey: '2:286', contextBn: 'আল্লাহ কাউকে তার সাধ্যের বাইরে দায়িত্ব দেন না।' },
    ],
  },
  {
    id: 'love',
    labelBn: 'প্রেমময়',
    labelEn: 'In Love',
    icon: 'heart-circle-outline',
    color: '#C47A7A',
    verses: [
      { verseKey: '30:21', contextBn: 'তিনি তোমাদের জন্য জোড়া সৃষ্টি করেছেন যাতে তোমরা প্রশান্তি পাও।' },
      { verseKey: '3:31', contextBn: 'যদি তোমরা আল্লাহকে ভালোবাসো, তবে আমাকে অনুসরণ করো।' },
      { verseKey: '2:165', contextBn: 'যারা ঈমান এনেছে তারা আল্লাহকে সবচেয়ে বেশি ভালোবাসে।' },
      { verseKey: '85:14', contextBn: 'তিনি ক্ষমাশীল, প্রেমময়।' },
      { verseKey: '19:96', contextBn: 'পরম করুণাময় তাদের জন্য ভালোবাসা সৃষ্টি করবেন।' },
    ],
  },
  {
    id: 'seeking',
    labelBn: 'অনুসন্ধানী',
    labelEn: 'Seeking',
    icon: 'search-outline',
    color: '#5B7DB1',
    verses: [
      { verseKey: '29:69', contextBn: 'যারা আমার পথে চেষ্টা করে, আমি তাদের পথ দেখাই।' },
      { verseKey: '51:56', contextBn: 'আমি জিন ও মানুষকে আমার ইবাদতের জন্যই সৃষ্টি করেছি।' },
      { verseKey: '2:269', contextBn: 'যাকে হিকমাহ দেওয়া হয়েছে, তাকে অনেক কল্যাণ দেওয়া হয়েছে।' },
      { verseKey: '20:114', contextBn: 'বলো, হে আমার রব! আমার জ্ঞান বাড়িয়ে দিন।' },
      { verseKey: '39:9', contextBn: 'যারা জানে আর যারা জানে না তারা কি সমান?' },
    ],
  },
];
