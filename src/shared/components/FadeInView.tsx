// src/shared/components/FadeInView.tsx
// A reusable container that gently fades its children in on mount

import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { FADE_CONFIG, SLIDE_UP_CONFIG } from '@/src/shared/lib/animations';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  slideUp?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({ children, delay = 0, slideUp = false, style }: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slideUp ? 16 : 0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withTiming(1, FADE_CONFIG);
      if (slideUp) {
        translateY.value = withTiming(0, SLIDE_UP_CONFIG);
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, slideUp, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
