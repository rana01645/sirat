import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useGamificationStore } from '@/src/shared/stores/gamificationStore';
import { useUserStore } from '@/src/shared/stores/userStore';
import { useReadingProgress } from '@/src/features/reader/hooks/useReadingProgress';
import { useJournal, type JournalEntry } from '@/src/features/reader/hooks/useJournal';
import { useBookmarks, type BookmarkedAyah } from '@/src/features/reader/hooks/useBookmarks';
import { useAuth } from '@/src/shared/providers/AuthProvider';
import { useSync } from '@/src/features/sync/hooks/useSync';
import { FadeInView } from '@/src/shared/components/FadeInView';
import type { BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import { RankDetailSheet } from '@/src/features/gamification/components/RankDetailSheet';
import { colors, fonts, spacing, STATUS_BAR_OFFSET } from '@/src/shared/lib/theme';

export default function ProfileScreen() {
  const { currentRank, nextRank, ilmCoins, progressToNextRank, nurLevel } =
    useGamificationStore();
  const { readingLevel, currentStreak, longestStreak } = useUserStore();
  const { stats, loading: statsLoading, reload: reloadStats } = useReadingProgress();
  const { entries, loading: notesLoading, reload: reloadNotes, deleteEntry } = useJournal();
  const { bookmarks, loading: bookmarksLoading, reload: reloadBookmarks, removeBookmark } = useBookmarks();
  const { user, signOut, loading: authLoading } = useAuth();
  const { pushSync, pullSync } = useSync();
  const router = useRouter();
  const [trackW, setTrackW] = useState(0);
  const [quranTrackW, setQuranTrackW] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const rankSheetRef = useRef<BottomSheetModalRef>(null);

  // Reload data when tab is focused
  useFocusEffect(
    useCallback(() => {
      reloadStats();
      reloadNotes();
      reloadBookmarks();
    }, [reloadStats, reloadNotes, reloadBookmarks])
  );

  const handleContinueReading = useCallback(() => {
    if (stats?.lastSurahId) {
      router.push({ pathname: '/reader', params: { surahId: String(stats.lastSurahId) } });
    } else {
      router.push('/reader');
    }
  }, [router, stats]);

  const navigateToSurah = useCallback((surahId: number) => {
    router.push({ pathname: '/reader', params: { surahId: String(surahId) } });
  }, [router]);

  const handlePushSync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await pushSync();
      if (result.success) {
        setSyncMsg('✓ ক্লাউডে সেভ হয়েছে');
      } else {
        setSyncMsg(`✗ ${result.error || 'সিঙ্ক ব্যর্থ হয়েছে'}`);
      }
    } catch {
      setSyncMsg('✗ সিঙ্ক ব্যর্থ হয়েছে');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  }, [pushSync]);

  const handlePullSync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await pullSync();
      if (result.success) {
        setSyncMsg('✓ ক্লাউড থেকে লোড হয়েছে');
        reloadStats();
        reloadNotes();
        reloadBookmarks();
      } else {
        setSyncMsg(`✗ ${result.error || 'সিঙ্ক ব্যর্থ হয়েছে'}`);
      }
    } catch {
      setSyncMsg('✗ সিঙ্ক ব্যর্থ হয়েছে');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  }, [pullSync, reloadStats, reloadNotes, reloadBookmarks]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <>
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>আমার প্রোফাইল</Text>
          <Text style={styles.headerSub}>আপনার কুরআন যাত্রার সারসংক্ষেপ</Text>
        </View>

        {/* ── Auth & Sync Card ── */}
        <FadeInView delay={50} slideUp>
          <View style={styles.authCard}>
            {user ? (
              <>
                <View style={styles.authUserRow}>
                  <View style={styles.authAvatar}>
                    <Ionicons name="person" size={22} color={colors.white} />
                  </View>
                  <View style={styles.authUserInfo}>
                    <Text style={styles.authEmail} numberOfLines={1}>{user.email}</Text>
                    <Text style={styles.authStatus}>✓ লগইন আছে</Text>
                  </View>
                </View>

                {/* Sync buttons */}
                <View style={styles.syncRow}>
                  <Pressable
                    style={[styles.syncBtn, styles.syncBtnPush]}
                    onPress={handlePushSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color={colors.sakina[600]} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={18} color={colors.sakina[600]} />
                        <Text style={styles.syncBtnText}>ক্লাউডে সেভ</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.syncBtn, styles.syncBtnPull]}
                    onPress={handlePullSync}
                    disabled={syncing}
                  >
                    <Ionicons name="cloud-download-outline" size={18} color={colors.nur[700]} />
                    <Text style={[styles.syncBtnText, { color: colors.nur[700] }]}>ক্লাউড থেকে লোড</Text>
                  </Pressable>
                </View>

                {syncMsg && <Text style={styles.syncMsg}>{syncMsg}</Text>}

                <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
                  <Text style={styles.signOutText}>লগআউট</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.authPromo}>
                  <Ionicons name="cloud-outline" size={32} color={colors.sakina[400]} />
                  <Text style={styles.authPromoTitle}>সব ডিভাইসে সিঙ্ক করুন</Text>
                  <Text style={styles.authPromoSub}>
                    লগইন করলে আপনার অগ্রগতি, বুকমার্ক ও নোট সব ডিভাইসে পাবেন
                  </Text>
                </View>
                <Pressable style={styles.loginBtn} onPress={() => router.push('/auth')}>
                  <Ionicons name="person-outline" size={18} color={colors.white} />
                  <Text style={styles.loginBtnText}>লগইন / রেজিস্ট্রেশন</Text>
                </Pressable>
              </>
            )}
          </View>
        </FadeInView>

        {/* ── Quran Completion ── */}
        <FadeInView delay={100} slideUp>
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={colors.sakina[600]} />
              <Text style={styles.completionTitle}>কুরআন সমাপ্তি</Text>
            </View>

            <View style={styles.completionStats}>
              <Text style={styles.completionBig}>
                {stats ? `${Math.round(stats.completionPercent * 100)}%` : '—'}
              </Text>
              <Text style={styles.completionSub}>
                {stats ? `${stats.totalUniqueAyahsRead} / ${stats.totalAyahs} আয়াত` : 'লোড হচ্ছে...'}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.quranTrack} onLayout={(e: LayoutChangeEvent) => setQuranTrackW(e.nativeEvent.layout.width)}>
              <View style={[styles.quranFill, { width: quranTrackW * (stats?.completionPercent ?? 0) }]} />
            </View>

            {/* Continue reading */}
            {stats && stats.lastSurahName !== '' && (
              <Pressable style={styles.continueBtn} onPress={handleContinueReading}>
                <View style={styles.continueBtnInner}>
                  <Ionicons name="play-circle-outline" size={20} color={colors.sakina[700]} />
                  <Text style={styles.continueBtnText}>
                    পড়া চালিয়ে যান — {stats.lastSurahName} : {stats.lastAyahNumber}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.midnight[300]} />
              </Pressable>
            )}
          </View>
        </FadeInView>

        {/* ── Surah Progress (recent) ── */}
        {stats && stats.surahProgress.length > 0 && (
          <FadeInView delay={200} slideUp>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>সূরা অগ্রগতি</Text>
              {stats.surahProgress.slice(0, 5).map((sp) => (
                <SurahProgressRow key={sp.surahId} item={sp} onPress={navigateToSurah} />
              ))}
              {stats.surahProgress.length > 5 && (
                <Text style={styles.moreText}>+ আরো {stats.surahProgress.length - 5}টি সূরা পড়া হয়েছে</Text>
              )}
            </View>
          </FadeInView>
        )}

        {/* ── Rank Card ── */}
        <FadeInView delay={300} slideUp>
          <Pressable onPress={() => rankSheetRef.current?.open()} style={styles.rankCard}>
            <View style={styles.rankTapHint}>
              <Text style={styles.rankArabic}>{currentRank.titleArabic}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            <Text style={styles.rankEnglish}>{currentRank.titleEnglish}</Text>
            <Text style={styles.rankBengali}>{currentRank.titleBengali}</Text>

            {nextRank && (
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack} onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}>
                  <View style={[styles.progressFill, { width: trackW * progressToNextRank }]} />
                </View>
                <Text style={styles.progressText}>
                  {ilmCoins} / {nextRank.minCoins} কয়েন — {nextRank.titleBengali}
                </Text>
              </View>
            )}

            <Text style={styles.rankTapLabel}>বিস্তারিত দেখুন ›</Text>
          </Pressable>
        </FadeInView>

        {/* Motivation */}
        <FadeInView delay={400} slideUp>
          <Text style={styles.motivation}>
            &ldquo;{currentRank.motivationTextBengali}&rdquo;
          </Text>
        </FadeInView>

        {/* ── Stats Grid ── */}
        <FadeInView delay={500} slideUp>
          <View style={styles.statsGrid}>
            <StatCard title="ইলম কয়েন" value={String(ilmCoins)} iconName="star-circle-outline" iconFamily="mci" />
            <StatCard title="নূর লেভেল" value={`${nurLevel}/10`} iconName="sunny-outline" iconFamily="ion" />
            <StatCard title="পঠিত আয়াত" value={String(stats?.totalUniqueAyahsRead ?? 0)} iconName="book-outline" iconFamily="ion" />
            <StatCard title="স্ট্রিক" value={`${currentStreak} দিন`} iconName="flame-outline" iconFamily="ion" />
            <StatCard title="সেরা স্ট্রিক" value={`${longestStreak} দিন`} iconName="trophy-outline" iconFamily="ion" />
            <StatCard title="লেভেল" value={readingLevel === 'beginner' ? 'শুরু' : readingLevel === 'intermediate' ? 'মধ্যম' : 'উন্নত'} iconName="bar-chart-outline" iconFamily="ion" />
          </View>
        </FadeInView>

        {/* ── Notes / Journal ── */}
        <FadeInView delay={600} slideUp>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="journal-outline" size={20} color={colors.sakina[600]} />
              <Text style={styles.sectionTitle}>আমার নোট</Text>
            </View>

            {notesLoading ? (
              <Text style={styles.emptyText}>লোড হচ্ছে...</Text>
            ) : entries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={36} color={colors.midnight[200]} />
                <Text style={styles.emptyText}>আপনার কোনো নোট নেই</Text>
                <Text style={styles.emptySubtext}>রিডারে আয়াত পড়তে গিয়ে নোট লিখুন</Text>
              </View>
            ) : (
              entries.map((entry) => (
                <NoteCard key={entry.id} entry={entry} onDelete={deleteEntry} onPress={navigateToSurah} />
              ))
            )}
          </View>
        </FadeInView>

        {/* ── Bookmarks ── */}
        <FadeInView delay={700} slideUp>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={20} color="#E05858" />
              <Text style={styles.sectionTitle}>প্রিয় আয়াত</Text>
            </View>

            {bookmarksLoading ? (
              <Text style={styles.emptyText}>লোড হচ্ছে...</Text>
            ) : bookmarks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={36} color={colors.midnight[200]} />
                <Text style={styles.emptyText}>কোনো আয়াত সংরক্ষিত নেই</Text>
                <Text style={styles.emptySubtext}>রিডারে ♡ চেপে প্রিয় আয়াত সংরক্ষণ করুন</Text>
              </View>
            ) : (
              bookmarks.map((bm) => (
                <BookmarkCard key={bm.id} bookmark={bm} onRemove={removeBookmark} onPress={navigateToSurah} />
              ))
            )}
          </View>
        </FadeInView>

      </View>
    </ScrollView>

    <RankDetailSheet
      sheetRef={rankSheetRef}
      currentRankId={currentRank.id}
      ilmCoins={ilmCoins}
    />
    </>
  );
}

// ── Sub-components ──

function SurahProgressRow({ item, onPress }: { item: { surahId: number; nameArabic: string; nameBengali: string; versesCount: number; versesRead: number; percent: number }; onPress: (surahId: number) => void }) {
  const [barW, setBarW] = useState(0);
  const isComplete = item.versesRead >= item.versesCount;

  return (
    <Pressable style={styles.surahRow} onPress={() => onPress(item.surahId)}>
      <View style={styles.surahRowLeft}>
        <Text style={styles.surahRowNum}>{item.surahId}</Text>
        <View>
          <Text style={styles.surahRowName}>{item.nameBengali}</Text>
          <Text style={styles.surahRowArabic}>{item.nameArabic}</Text>
        </View>
      </View>
      <View style={styles.surahRowRight}>
        <Text style={styles.surahRowCount}>{item.versesRead}/{item.versesCount}</Text>
        <View style={styles.surahBar} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
          <View style={[
            styles.surahBarFill,
            { width: barW * item.percent },
            isComplete && styles.surahBarComplete,
          ]} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.midnight[200]} />
    </Pressable>
  );
}

function NoteCard({ entry, onDelete, onPress }: { entry: JournalEntry; onDelete: (id: number) => void; onPress: (surahId: number) => void }) {
  return (
    <Pressable style={styles.noteCard} onPress={() => onPress(entry.surahId)}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteRef}>
          সূরা {entry.surahNameBengali} — {entry.surahId}:{entry.verseNumber}
        </Text>
        <Pressable onPress={() => onDelete(entry.id)} hitSlop={12}>
          <Ionicons name="trash-outline" size={16} color={colors.midnight[300]} />
        </Pressable>
      </View>
      <Text style={styles.noteArabic} numberOfLines={1}>{entry.textArabic}</Text>
      <Text style={styles.noteReflection}>{entry.reflectionText}</Text>
      {entry.createdAt && (
        <Text style={styles.noteDate}>{entry.createdAt.split('T')[0]}</Text>
      )}
    </Pressable>
  );
}

function BookmarkCard({ bookmark, onRemove, onPress }: { bookmark: BookmarkedAyah; onRemove: (id: number) => void; onPress: (surahId: number) => void }) {
  return (
    <Pressable style={styles.noteCard} onPress={() => onPress(bookmark.surahId)}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteRef}>
          সূরা {bookmark.surahNameBengali} — {bookmark.surahId}:{bookmark.verseNumber}
        </Text>
        <Pressable onPress={() => onRemove(bookmark.id)} hitSlop={12}>
          <Ionicons name="heart-dislike-outline" size={16} color={colors.midnight[300]} />
        </Pressable>
      </View>
      <Text style={styles.noteArabic} numberOfLines={2}>{bookmark.textArabic}</Text>
      <Text style={styles.bookmarkBengali} numberOfLines={2}>{bookmark.textBengali}</Text>
      {bookmark.createdAt && (
        <Text style={styles.noteDate}>{bookmark.createdAt.split('T')[0]}</Text>
      )}
    </Pressable>
  );
}

function StatCard({ title, value, iconName, iconFamily }: { title: string; value: string; iconName: string; iconFamily: 'ion' | 'mci' }) {
  const IconComponent = iconFamily === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={styles.statCard}>
      <IconComponent name={iconName as never} size={24} color={colors.sakina[500]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.nur[50],
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: STATUS_BAR_OFFSET,
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

  // Completion card
  completionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  completionStats: {
    alignItems: 'center',
    marginBottom: 12,
  },
  completionBig: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.sakina[600],
  },
  completionSub: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    marginTop: 2,
  },
  quranTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.nur[100],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  quranFill: {
    height: '100%',
    backgroundColor: colors.sakina[500],
    borderRadius: 4,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sakina[50],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  continueBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  continueBtnText: {
    fontSize: 14,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[700],
    flex: 1,
  },

  // Surah progress
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  surahRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  surahRowNum: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.midnight[300],
    width: 24,
    textAlign: 'center',
  },
  surahRowName: {
    fontSize: 14,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[600],
  },
  surahRowArabic: {
    fontSize: 14,
    fontFamily: fonts.arabic,
    color: colors.midnight[400],
  },
  surahRowRight: {
    alignItems: 'flex-end',
    width: 80,
  },
  surahRowCount: {
    fontSize: 12,
    color: colors.midnight[400],
    marginBottom: 4,
  },
  surahBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.nur[100],
    borderRadius: 2,
    overflow: 'hidden',
  },
  surahBarFill: {
    height: '100%',
    backgroundColor: colors.sakina[400],
    borderRadius: 2,
  },
  surahBarComplete: {
    backgroundColor: colors.sakina[600],
  },
  moreText: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
    textAlign: 'center',
    marginTop: 4,
  },

  // Rank card
  rankCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankArabic: {
    fontSize: 32,
    color: colors.nur[500],
    marginBottom: 6,
  },
  rankTapHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  rankTapLabel: {
    fontFamily: fonts.bengali,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 10,
  },
  rankEnglish: {
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '600',
    color: colors.midnight[600],
    marginBottom: 4,
  },
  rankBengali: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.midnight[400],
    marginBottom: 20,
  },
  progressContainer: {
    marginBottom: 4,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.nur[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.sakina[400],
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.midnight[300],
    textAlign: 'center',
    marginTop: 8,
  },
  motivation: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.midnight[400],
    fontStyle: 'italic',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 24,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.midnight[600],
  },
  statTitle: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
    textAlign: 'center',
  },

  // Notes
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[200],
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteRef: {
    fontSize: 12,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[600],
  },
  noteArabic: {
    fontSize: 18,
    fontFamily: fonts.arabic,
    color: colors.midnight[600],
    textAlign: 'right',
    marginBottom: 8,
  },
  noteReflection: {
    fontSize: 15,
    fontFamily: fonts.bengali,
    color: colors.midnight[600],
    lineHeight: 24,
  },
  bookmarkBengali: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[500],
    lineHeight: 22,
  },
  noteDate: {
    fontSize: 11,
    color: colors.midnight[200],
    marginTop: 8,
    textAlign: 'right',
  },

  // Auth & Sync
  authCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  authUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  authAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sakina[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  authUserInfo: {
    flex: 1,
  },
  authEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.midnight[700],
  },
  authStatus: {
    fontSize: 12,
    color: colors.sakina[600],
    marginTop: 2,
  },
  syncRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  syncBtnPush: {
    backgroundColor: colors.sakina[50],
  },
  syncBtnPull: {
    backgroundColor: colors.nur[100],
  },
  syncBtnText: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[600],
  },
  syncMsg: {
    fontSize: 12,
    fontFamily: fonts.bengali,
    color: colors.sakina[600],
    textAlign: 'center',
    marginBottom: 8,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.nur[100],
  },
  signOutText: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: '#D32F2F',
  },
  authPromo: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  authPromoTitle: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  authPromoSub: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sakina[600],
    borderRadius: 14,
    paddingVertical: 12,
  },
  loginBtnText: {
    fontSize: 15,
    fontFamily: fonts.bengaliBold,
    color: colors.white,
  },
});
