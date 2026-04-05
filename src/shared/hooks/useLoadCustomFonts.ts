// src/shared/hooks/useLoadCustomFonts.ts
// Loads Amiri (Arabic) and Hind Siliguri (Bengali) before the app renders.

import { useFonts } from 'expo-font';

export function useLoadCustomFonts() {
  const [loaded, error] = useFonts({
    'Amiri-Regular': require('@/assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('@/assets/fonts/Amiri-Bold.ttf'),
    'HindSiliguri-Regular': require('@/assets/fonts/HindSiliguri-Regular.ttf'),
    'HindSiliguri-Medium': require('@/assets/fonts/HindSiliguri-Medium.ttf'),
    'HindSiliguri-Bold': require('@/assets/fonts/HindSiliguri-Bold.ttf'),
  });

  return { loaded, error };
}
