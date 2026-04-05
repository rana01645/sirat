// src/shared/components/SplashSeeder.tsx
// Peaceful loading screen shown while SQLite database is initializing.
// Dumb UI component — no business logic.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { FADE_CONFIG, NUR_PULSE_CONFIG } from '@/src/shared/lib/animations';
import { colors } from '@/src/shared/lib/theme';

export function SplashSeeder() {
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.95);

  useEffect(() => {
    // Gentle fade-in of the whole screen
    opacity.value = withTiming(1, FADE_CONFIG);

    // Text fades in slightly after
    const timeout = setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 800 });
    }, 400);

    // Soft breathing pulse on the glow
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { ...NUR_PULSE_CONFIG, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { ...NUR_PULSE_CONFIG, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      true
    );

    return () => clearTimeout(timeout);
  }, [opacity, textOpacity, glowScale]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <Animated.View style={[containerAnimStyle, styles.container]}>
      {/* Soft glowing circle — Nur metaphor */}
      <Animated.View style={[glowAnimStyle, styles.glowWrapper]}>
        <View style={styles.outerGlow}>
          <View style={styles.innerGlow}>
            <MaterialCommunityIcons name="mosque" size={48} color={colors.sakina[400]} />
          </View>
        </View>
      </Animated.View>

      {/* Bengali primary text */}
      <Animated.View style={[textAnimStyle, styles.textContainer]}>
        <Text style={styles.titleText}>
          আপনার যাত্রা প্রস্তুত করা হচ্ছে...
        </Text>
        <Text style={styles.subtitleText}>
          Preparing your journey...
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.nur[50],
    paddingHorizontal: 32,
  },
  glowWrapper: {
    marginBottom: 64,
  },
  outerGlow: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: `${colors.nur[200]}99`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.nur[300]}80`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mosqueEmoji: {
    fontSize: 32,
  },
  textContainer: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.midnight[600],
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 14,
    color: colors.midnight[400],
    textAlign: 'center',
  },
});
