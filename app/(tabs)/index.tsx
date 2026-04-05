// The Home Screen — Mission Hub
// Shows: Nur Lantern, Daily Bite progress, Rank, Streak message, Start button.
// This is where the gamification loop lives.

import React, { useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGamificationStore } from '@/src/shared/stores/gamificationStore';
import { useGamificationSync } from '@/src/features/gamification/hooks/useGamificationSync';
import { useDailyBite } from '@/src/features/gamification/hooks/useDailyBite';
import { NurLantern } from '@/src/features/gamification/components/NurLantern';
import { DailyProgressRing } from '@/src/features/gamification/components/DailyProgressRing';
import { RankBadge } from '@/src/features/gamification/components/RankBadge';
import { CoinPopup, type CoinPopupRef } from '@/src/features/gamification/components/CoinPopup';
import { FadeInView } from '@/src/shared/components/FadeInView';
import { getActiveStreakMessage, getBrokenStreakMessage } from '@/src/features/gamification/constants/streak-messages';
import { colors, fonts, spacing } from '@/src/shared/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const coinPopupRef = useRef<CoinPopupRef | null>(null);

  // Sync gamification state with SQLite
  useGamificationSync();

  const {
    ilmCoins, nurLevel, currentStreak, longestStreak,
    currentRank, nextRank, progressToNextRank,
    dailyProgress, dailyGoalAyahs,
  } = useGamificationStore();

  const { surah, ayahs, isLoading } = useDailyBite();

  const streakMessage = currentStreak > 0
    ? getActiveStreakMessage(currentStreak)
    : getBrokenStreakMessage(0);

  const handleStartReading = () => {
    if (surah) {
      router.push('/(tabs)/reader');
    }
  };

  const greeting = getGreeting();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>সিরাত — صراط</Text>
          <Text style={styles.headerSub}>প্রতিদিন একটু একটু করে কুরআন বুঝুন</Text>
        </View>

        {/* Greeting */}
        <FadeInView delay={100}>
          <Text style={styles.greeting}>{greeting}</Text>
        </FadeInView>

        {/* Nur Lantern — the emotional centerpiece */}
        <FadeInView delay={300}>
          <NurLantern nurLevel={nurLevel} streak={currentStreak} />
        </FadeInView>

        {/* Streak message — always gentle */}
        <FadeInView delay={500} slideUp>
          <Text style={styles.streakTitle}>{streakMessage.title}</Text>
          <Text style={styles.streakBody}>{streakMessage.bodyBn}</Text>
        </FadeInView>

        {/* Daily Bite Mission Card */}
        <FadeInView delay={700} slideUp>
          <View style={styles.missionCard}>
            <View style={styles.missionBody}>
              <Text style={styles.missionLabel}>আজকের মিশন</Text>
              <Text style={styles.missionTitle}>
                {dailyGoalAyahs} আয়াত পড়ুন
              </Text>
              {surah && !isLoading && (
                <Text style={styles.missionSurah}>
                  <Ionicons name="book-outline" size={13} color={colors.midnight[400]} /> {surah.name_arabic} — {surah.name_bengali}
                </Text>
              )}

              <DailyProgressRing
                progress={dailyProgress.ayahsRead}
                goal={dailyGoalAyahs}
              />
            </View>

            {/* Start Reading Button */}
            {!dailyProgress.goalCompleted && (
              <Pressable
                onPress={handleStartReading}
                style={styles.startBtn}
              >
                <Text style={styles.startBtnText}>
                  {dailyProgress.ayahsRead > 0 ? 'পড়া চালিয়ে যান →' : 'শুরু করুন →'}
                </Text>
              </Pressable>
            )}

            {dailyProgress.goalCompleted && (
              <Pressable
                onPress={handleStartReading}
                style={styles.continueBtn}
              >
                <Text style={styles.continueBtnText}>আরও পড়ুন →</Text>
              </Pressable>
            )}
          </View>
        </FadeInView>

        {/* Today's Earnings — 2×2 grid with distinct tiles */}
        {dailyProgress.coinsEarned > 0 && (
          <FadeInView delay={900} slideUp>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>আজকের উপার্জন</Text>
              <View style={styles.earningsGrid}>
                <View style={[styles.earningTile, { backgroundColor: colors.nur[100] }]}>
                  <MaterialCommunityIcons name="star-circle-outline" size={24} color={colors.nur[600]} />
                  <Text style={styles.earningValue}>{dailyProgress.coinsEarned}</Text>
                  <Text style={styles.earningLabel}>ইলম কয়েন</Text>
                </View>
                <View style={[styles.earningTile, { backgroundColor: colors.sakina[50] }]}>
                  <Ionicons name="book-outline" size={22} color={colors.sakina[600]} />
                  <Text style={styles.earningValue}>{dailyProgress.ayahsRead}</Text>
                  <Text style={styles.earningLabel}>আয়াত পঠিত</Text>
                </View>
                <View style={[styles.earningTile, { backgroundColor: '#FFF5F0' }]}>
                  <Ionicons name="document-text-outline" size={22} color="#C4724B" />
                  <Text style={styles.earningValue}>{dailyProgress.tafsirsRead}</Text>
                  <Text style={styles.earningLabel}>তাফসীর পড়া</Text>
                </View>
                <View style={[styles.earningTile, { backgroundColor: '#F0F4FF' }]}>
                  <Ionicons name="pencil-outline" size={22} color="#5B7DB1" />
                  <Text style={styles.earningValue}>{dailyProgress.notesWritten}</Text>
                  <Text style={styles.earningLabel}>নোট লেখা</Text>
                </View>
              </View>
            </View>
          </FadeInView>
        )}

        {/* Rank Badge */}
        <FadeInView delay={1100} slideUp>
          <RankBadge
            currentRank={currentRank}
            nextRank={nextRank}
            progress={progressToNextRank}
            ilmCoins={ilmCoins}
          />
        </FadeInView>

        {/* Lifetime Stats */}
        <FadeInView delay={1300} slideUp>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>সামগ্রিক অগ্রগতি</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconCircle}>
                  <Ionicons name="flame-outline" size={20} color={colors.nur[600]} />
                </View>
                <Text style={styles.statValue}>{longestStreak}</Text>
                <Text style={styles.statLabel}>সর্বোচ্চ ধারা</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.sakina[50] }]}>
                  <Ionicons name="book-outline" size={20} color={colors.sakina[600]} />
                </View>
                <Text style={styles.statValue}>{useGamificationStore.getState().totalAyahsRead}</Text>
                <Text style={styles.statLabel}>মোট আয়াত</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#F0F4FF' }]}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={20} color="#5B7DB1" />
                </View>
                <Text style={styles.statValue}>{useGamificationStore.getState().totalSessions}</Text>
                <Text style={styles.statLabel}>মোট সেশন</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Coin popup overlay */}
      <CoinPopup popupRef={coinPopupRef} />
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'তাহাজ্জুদের সময়';
  if (hour < 12) return 'সুপ্রভাত';
  if (hour < 17) return 'শুভ দুপুর';
  if (hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.nur[50],
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[800],
  },
  headerSub: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    marginTop: 2,
  },
  greeting: {
    fontSize: 16,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[400],
    marginBottom: 8,
    textAlign: 'center',
  },

  // Streak message
  streakTitle: {
    fontSize: 18,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[600],
    textAlign: 'center',
    marginBottom: 6,
  },
  streakBody: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 32,
  },

  // Mission card
  missionCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.midnight[200],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  missionBody: {
    // Progress bar now lives below text, no side-by-side layout
  },
  missionLabel: {
    fontSize: 12,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[600],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  missionTitle: {
    fontSize: 22,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
    marginBottom: 6,
  },
  missionSurah: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  startBtn: {
    backgroundColor: colors.sakina[600],
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  startBtnText: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.white,
  },
  continueBtn: {
    backgroundColor: colors.nur[100],
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[700],
  },

  // Shared section wrapper
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[500],
    marginBottom: 12,
    marginLeft: 4,
  },

  // Earnings 2×2 grid
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  earningTile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  earningValue: {
    fontSize: 20,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  earningLabel: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    marginTop: -2,
  },

  // Stats — 3 cards in a row, full width
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexBasis: 0,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 8,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.nur[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
});
