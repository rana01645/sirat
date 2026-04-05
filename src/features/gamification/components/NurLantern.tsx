// src/features/gamification/components/NurLantern.tsx
// The emotional centerpiece — a glowing lantern that brightens with streak.
// Level 1 = dim amber, Level 10 = radiant gold with pulsing glow.
// Uses Animated API for breathing pulse effect.

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '@/src/shared/lib/theme';

interface NurLanternProps {
  nurLevel: number; // 1-10
  streak: number;
}

export function NurLantern({ nurLevel, streak }: NurLanternProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Breathing pulse — faster and brighter at higher levels
  useEffect(() => {
    const duration = Math.max(1500, 3000 - nurLevel * 150);
    const maxScale = 1 + nurLevel * 0.02;
    const maxGlow = 0.1 + nurLevel * 0.09; // 0.19 to 1.0

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: maxScale,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: maxGlow,
            duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: maxGlow * 0.6,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [nurLevel, pulseAnim, glowAnim]);

  // Color intensifies with level
  const lanternColor = nurLevel <= 3
    ? colors.nur[300] // dim amber
    : nurLevel <= 6
    ? colors.nur[400] // warm gold
    : colors.nur[500]; // bright gold

  const glowColor = nurLevel <= 3
    ? 'rgba(196, 166, 112, 0.2)'
    : nurLevel <= 6
    ? 'rgba(196, 166, 112, 0.35)'
    : 'rgba(218, 190, 130, 0.5)';

  const lanternSize = 120 + nurLevel * 4;

  return (
    <View style={styles.container}>
      {/* Outer glow rings */}
      {nurLevel >= 3 && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: lanternSize + 80,
              height: lanternSize + 80,
              borderRadius: (lanternSize + 80) / 2,
              backgroundColor: glowColor,
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}
      {nurLevel >= 6 && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: lanternSize + 50,
              height: lanternSize + 50,
              borderRadius: (lanternSize + 50) / 2,
              backgroundColor: glowColor,
              opacity: Animated.multiply(glowAnim, 1.3),
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}

      {/* Main lantern body */}
      <Animated.View
        style={[
          styles.lantern,
          {
            width: lanternSize,
            height: lanternSize,
            borderRadius: lanternSize / 2,
            backgroundColor: lanternColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Lantern icon */}
        <Text style={styles.lanternIcon}>🪔</Text>

        {/* Streak number */}
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>দিনের ধারা</Text>
      </Animated.View>

      {/* Nur level indicator */}
      <View style={styles.levelRow}>
        {Array.from({ length: 10 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.levelDot,
              i < nurLevel ? styles.levelDotActive : styles.levelDotInactive,
              i < nurLevel && nurLevel >= 7 && styles.levelDotBright,
            ]}
          />
        ))}
      </View>
      <Text style={styles.nurLabel}>নূর লেভেল {nurLevel}/১০</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  glowRing: {
    position: 'absolute',
  },
  lantern: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C4A670',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  lanternIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 32,
    fontFamily: fonts.bengaliBold,
    color: colors.white,
  },
  streakLabel: {
    fontSize: 11,
    fontFamily: fonts.bengaliMedium,
    color: 'rgba(255,255,255,0.85)',
    marginTop: -2,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelDotActive: {
    backgroundColor: colors.nur[400],
  },
  levelDotInactive: {
    backgroundColor: colors.nur[200],
  },
  levelDotBright: {
    backgroundColor: colors.nur[500],
    shadowColor: colors.nur[500],
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  nurLabel: {
    fontSize: 12,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[400],
    marginTop: 6,
  },
});
