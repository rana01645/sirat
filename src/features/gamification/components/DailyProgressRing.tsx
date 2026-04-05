// src/features/gamification/components/DailyProgressRing.tsx
// Horizontal progress bar showing ayahs read vs daily goal.
// Clean, minimal — fits inside mission card layout.

import React, { useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/src/shared/lib/theme';

interface DailyProgressRingProps {
  progress: number;
  goal: number;
}

export function DailyProgressRing({ progress, goal }: DailyProgressRingProps) {
  const isComplete = progress >= goal;
  const fraction = Math.min(progress / Math.max(goal, 1), 1);
  const pct = Math.round(fraction * 100);
  const [trackWidth, setTrackWidth] = useState(0);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const fillWidth = Math.max(trackWidth * fraction, fraction > 0 ? 4 : 0);

  return (
    <View style={styles.container}>
      {/* Top row: count + percentage */}
      <View style={styles.topRow}>
        <Text style={styles.count}>
          {progress}<Text style={styles.countSlash}>/{goal}</Text>
        </Text>
        {isComplete ? (
          <View style={styles.badgeRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.sakina[500]} />
            <Text style={styles.badge}> সম্পন্ন</Text>
          </View>
        ) : (
          <Text style={styles.percent}>{pct}%</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack} onLayout={onTrackLayout}>
        <View
          style={[
            styles.barFill,
            {
              width: fillWidth,
              backgroundColor: isComplete ? colors.sakina[500] : colors.sakina[400],
            },
          ]}
        />
        {/* Step markers for each ayah */}
        {goal <= 10 && trackWidth > 0 && Array.from({ length: goal - 1 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.stepMark,
              { left: ((i + 1) / goal) * trackWidth },
            ]}
          />
        ))}
      </View>

      <Text style={styles.label}>আয়াত পঠিত</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  count: {
    fontSize: 22,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  countSlash: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
  },
  percent: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[600],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    fontSize: 13,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[600],
  },
  barTrack: {
    height: 10,
    backgroundColor: colors.nur[200],
    borderRadius: 5,
    position: 'relative',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  stepMark: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    marginTop: 6,
  },
});
