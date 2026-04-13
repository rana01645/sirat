import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, type BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import { RANKS, type Rank } from '@/src/features/gamification/constants/ranks';
import { colors, fonts, spacing } from '@/src/shared/lib/theme';

interface RankDetailSheetProps {
  sheetRef: React.RefObject<BottomSheetModalRef | null>;
  currentRankId: string;
  ilmCoins: number;
}

const RANK_COLORS: Record<string, string> = {
  muhib: '#8B5CF6',
  mutallim: '#3B82F6',
  fahim: '#F59E0B',
  'sahib-al-quran': '#10B981',
};

export function RankDetailSheet({ sheetRef, currentRankId, ilmCoins }: RankDetailSheetProps) {
  return (
    <BottomSheetModal ref={sheetRef} snapPoint={0.85}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>আধ্যাত্মিক পদমর্যাদা</Text>
        <Text style={styles.subtitle}>কুরআনের সাথে আপনার যাত্রার স্তর</Text>

        {RANKS.map((rank, index) => {
          const isCurrent = rank.id === currentRankId;
          const isUnlocked = ilmCoins >= rank.minCoins;
          const accentColor = RANK_COLORS[rank.id] ?? colors.primary;

          return (
            <View
              key={rank.id}
              style={[
                styles.rankItem,
                isCurrent && { borderColor: accentColor, borderWidth: 2 },
                !isUnlocked && styles.rankLocked,
              ]}
            >
              {/* Header row */}
              <View style={styles.rankHeader}>
                <View style={[styles.rankIcon, { backgroundColor: isUnlocked ? accentColor : colors.muted }]}>
                  <Ionicons
                    name={rank.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={colors.white}
                  />
                </View>
                <View style={styles.rankTitles}>
                  <Text style={styles.rankArabic}>{rank.titleArabic}</Text>
                  <Text style={[styles.rankBengaliTitle, !isUnlocked && styles.textLocked]}>
                    {rank.titleBengali}
                  </Text>
                </View>
                <View style={styles.rankBadge}>
                  {isCurrent ? (
                    <View style={[styles.currentBadge, { backgroundColor: accentColor }]}>
                      <Text style={styles.currentBadgeText}>বর্তমান</Text>
                    </View>
                  ) : isUnlocked ? (
                    <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                  ) : (
                    <Ionicons name="lock-closed" size={18} color={colors.muted} />
                  )}
                </View>
              </View>

              {/* Coin threshold */}
              <View style={styles.coinRow}>
                <Ionicons name="sparkles" size={14} color={isUnlocked ? '#F59E0B' : colors.muted} />
                <Text style={[styles.coinText, !isUnlocked && styles.textLocked]}>
                  {rank.maxCoins
                    ? `${rank.minCoins} — ${rank.maxCoins} ইলম কয়েন`
                    : `${rank.minCoins}+ ইলম কয়েন`}
                </Text>
              </View>

              {/* Bengali meaning */}
              <Text style={[styles.meaningText, !isUnlocked && styles.textLocked]}>
                {rank.meaningBengali}
              </Text>

              {/* Motivation for current rank */}
              {isCurrent && (
                <View style={styles.motivationBox}>
                  <Text style={styles.motivationLabel}>💡 অনুপ্রেরণা</Text>
                  <Text style={styles.motivationText}>{rank.motivationTextBengali}</Text>
                </View>
              )}

              {/* Connector line between ranks */}
              {index < RANKS.length - 1 && (
                <View style={styles.connector}>
                  <View style={[styles.connectorLine, isUnlocked && { backgroundColor: accentColor }]} />
                </View>
              )}
            </View>
          );
        })}

        {/* Current progress summary */}
        <View style={styles.progressSummary}>
          <Text style={styles.progressTitle}>আপনার ইলম কয়েন</Text>
          <Text style={styles.progressCoins}>{ilmCoins}</Text>
          {(() => {
            const currentIdx = RANKS.findIndex((r) => r.id === currentRankId);
            const next = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;
            if (!next) {
              return <Text style={styles.progressHint}>🎉 আপনি সর্বোচ্চ পদমর্যাদায় পৌঁছেছেন!</Text>;
            }
            const remaining = next.minCoins - ilmCoins;
            return (
              <Text style={styles.progressHint}>
                {next.titleBengali} পদমর্যাদায় পৌঁছাতে আরও {remaining} কয়েন প্রয়োজন
              </Text>
            );
          })()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fonts.bengaliSemiBold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.bengali,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  rankItem: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  rankLocked: {
    opacity: 0.6,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankTitles: {
    flex: 1,
  },
  rankArabic: {
    fontFamily: fonts.arabic,
    fontSize: 20,
    color: colors.text,
    lineHeight: 28,
  },
  rankBengaliTitle: {
    fontFamily: fonts.bengaliSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  textLocked: {
    color: colors.muted,
  },
  rankBadge: {
    marginLeft: 8,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontFamily: fonts.bengaliSemiBold,
    fontSize: 12,
    color: colors.white,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  coinText: {
    fontFamily: fonts.bengali,
    fontSize: 13,
    color: colors.muted,
  },
  meaningText: {
    fontFamily: fonts.bengali,
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 22,
  },
  motivationBox: {
    marginTop: 10,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 10,
    padding: 12,
  },
  motivationLabel: {
    fontFamily: fonts.bengaliSemiBold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: 4,
  },
  motivationText: {
    fontFamily: fonts.bengali,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  connector: {
    alignItems: 'center',
    paddingTop: 12,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.muted,
    borderRadius: 1,
    opacity: 0.3,
  },
  progressSummary: {
    alignItems: 'center',
    marginTop: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  progressTitle: {
    fontFamily: fonts.bengali,
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  progressCoins: {
    fontFamily: fonts.bengaliSemiBold,
    fontSize: 32,
    color: '#F59E0B',
  },
  progressHint: {
    fontFamily: fonts.bengali,
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 4,
    textAlign: 'center',
  },
});
