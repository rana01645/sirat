// src/features/gamification/components/RankBadge.tsx
// Displays current rank with progress bar to next rank.

import React, { useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '@/src/shared/lib/theme';
import type { Rank } from '@/src/features/gamification/constants/ranks';

interface RankBadgeProps {
  currentRank: Rank;
  nextRank: Rank | null;
  progress: number; // 0-1
  ilmCoins: number;
}

export function RankBadge({ currentRank, nextRank, progress, ilmCoins }: RankBadgeProps) {
  const [barWidth, setBarWidth] = useState(0);

  return (
    <View style={styles.container}>
      {/* Rank title row */}
      <View style={styles.titleRow}>
        <Text style={styles.rankArabic}>{currentRank.titleArabic}</Text>
        <Text style={styles.rankBengali}>{currentRank.titleBengali}</Text>
      </View>

      {/* Coins */}
      <View style={styles.coinRow}>
        <MaterialCommunityIcons name="star-circle-outline" size={20} color={colors.nur[600]} />
        <Text style={styles.coinCount}>{ilmCoins}</Text>
        <Text style={styles.coinLabel}>ইলম কয়েন</Text>
      </View>

      {/* Progress to next rank */}
      {nextRank && (
        <View style={styles.progressSection}>
          <View
            style={styles.progressBar}
            onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
          >
            <View style={[styles.progressFill, { width: barWidth * progress }]} />
          </View>
          <Text style={styles.progressLabel}>
            পরবর্তী: {nextRank.titleBengali} ({nextRank.minCoins} কয়েন)
          </Text>
        </View>
      )}

      {!nextRank && (
        <Text style={styles.maxRankLabel}>সর্বোচ্চ পদমর্যাদা অর্জিত!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.midnight[200],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  rankArabic: {
    fontSize: 22,
    fontFamily: fonts.arabic,
    color: colors.sakina[700],
  },
  rankBengali: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  coinCount: {
    fontSize: 20,
    fontFamily: fonts.bengaliBold,
    color: colors.nur[600],
  },
  coinLabel: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  progressSection: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.nur[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.sakina[500],
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  maxRankLabel: {
    fontSize: 14,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[600],
    textAlign: 'center',
  },
});
