// src/shared/lib/animations.ts
// Shared animation config — all transitions are slow and gentle (Sukoon philosophy)

import { withTiming, withSpring, type WithTimingConfig, type WithSpringConfig } from 'react-native-reanimated';

// Gentle fade-in for screen transitions and content reveals
export const FADE_CONFIG: WithTimingConfig = {
  duration: 600,
};

// Slow spring for interactive elements (cards expanding, toggles)
export const GENTLE_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 90,
  mass: 1,
};

// Very slow fade for the Nur glow pulsing
export const NUR_PULSE_CONFIG: WithTimingConfig = {
  duration: 2000,
};

// Content slide-up on screen enter
export const SLIDE_UP_CONFIG: WithTimingConfig = {
  duration: 800,
};

// Helper wrappers
export function gentleFadeIn(toValue: number) {
  'worklet';
  return withTiming(toValue, FADE_CONFIG);
}

export function gentleSlideUp(toValue: number) {
  'worklet';
  return withTiming(toValue, SLIDE_UP_CONFIG);
}

export function gentleSpring(toValue: number) {
  'worklet';
  return withSpring(toValue, GENTLE_SPRING);
}
