// app/(tabs)/vocabulary.tsx
// Dedicated vocabulary learning tab — shows coverage stats and word list.
// Core motivator: "এই শব্দ শিখলে কুরআনের আরো X% বুঝবেন"

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, Modal, ScrollView,
  StyleSheet, ActivityIndicator, type LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVocabulary, type VocabStats } from '@/src/features/vocabulary/hooks/useVocabulary';
import { useWordAudio } from '@/src/features/vocabulary/hooks/useWordAudio';
import { WordDetailSheet } from '@/src/features/vocabulary/components/WordDetailSheet';
import type { BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import type { Word } from '@/src/types/quran';
import { colors, fonts } from '@/src/shared/lib/theme';

type FilterMode = 'all' | 'learned' | 'unlearned';

export default function VocabularyScreen() {
  const { db } = useDatabaseContext();
  const vocab = useVocabulary();
  const wordAudio = useWordAudio(db);
  const sheetRef = useRef<BottomSheetModalRef>(null);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [progressBarW, setProgressBarW] = useState(0);
  const [showStats, setShowStats] = useState(false);

  // Compute frequency brackets for stats modal
  const frequencyBrackets = useMemo(() => {
    if (vocab.words.length === 0) return [];
    const sorted = [...vocab.words].sort((a, b) => a.rank - b.rank);
    const totalQuranWords = 77430;
    const brackets = [10, 25, 50, 100, 200, 300, 500];
    let cumFreq = 0;
    let bracketIdx = 0;
    const results: { count: number; coverage: number }[] = [];

    for (let i = 0; i < sorted.length && bracketIdx < brackets.length; i++) {
      cumFreq += sorted[i].frequency;
      while (bracketIdx < brackets.length && i + 1 >= brackets[bracketIdx]) {
        results.push({
          count: brackets[bracketIdx],
          coverage: parseFloat(((cumFreq / totalQuranWords) * 100).toFixed(1)),
        });
        bracketIdx++;
      }
    }
    return results;
  }, [vocab.words]);

  // Reload on tab focus
  useFocusEffect(
    useCallback(() => {
      vocab.reload();
    }, [vocab.reload])
  );

  // Filtered words
  const filteredWords = useMemo(() => {
    let list = vocab.words;
    if (filter === 'learned') {
      list = list.filter((w) => vocab.isLearned(w.id));
    } else if (filter === 'unlearned') {
      list = list.filter((w) => !vocab.isLearned(w.id));
    }
    return list;
  }, [vocab.words, vocab.learnedIds, filter, vocab.isLearned]);

  // Search handler (debounced via button press or submit)
  const handleSearch = useCallback(() => {
    vocab.loadWords({
      search: search.trim() || undefined,
      limit: 800,
    });
  }, [search, vocab.loadWords]);

  // Load more words on scroll
  const handleLoadMore = useCallback(() => {
    if (!vocab.loading && vocab.words.length >= 100) {
      vocab.loadWords({
        search: search.trim() || undefined,
        limit: 400,
        offset: vocab.words.length,
      });
    }
  }, [search, vocab]);

  const handleWordPress = useCallback((word: Word) => {
    setSelectedWordId(word.id);
    sheetRef.current?.open();
  }, []);

  const handleMarkLearned = useCallback((wordId: number) => {
    vocab.markLearned(wordId);
  }, [vocab.markLearned]);

  const handleUnmarkLearned = useCallback((wordId: number) => {
    vocab.unmarkLearned(wordId);
  }, [vocab.unmarkLearned]);

  // Coverage for a single word — what % of Quran this word represents
  const totalOccurrences = useMemo(() => {
    return vocab.words.reduce((sum, w) => sum + w.frequency, 0) || 77430;
  }, [vocab.words]);

  const renderWord = useCallback(({ item }: { item: Word }) => {
    const learned = vocab.isLearned(item.id);
    const coveragePct = ((item.frequency / 77430) * 100);
    const coverageDisplay = coveragePct >= 0.1 ? coveragePct.toFixed(1) : '<0.1';
    const isPlaying = wordAudio.playingWordId === item.id && wordAudio.audioState === 'playing';
    const isLoading = wordAudio.playingWordId === item.id && wordAudio.audioState === 'loading';

    return (
      <Pressable style={styles.wordCard} onPress={() => handleWordPress(item)}>
        {/* Top row: rank badge + play + learned check */}
        <View style={styles.wordTopRow}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{item.rank}</Text>
          </View>
          <View style={styles.wordTopActions}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                if (isPlaying) {
                  wordAudio.stopWord();
                } else {
                  wordAudio.playWord(item.id);
                }
              }}
              hitSlop={8}
              style={[styles.playSmallBtn, isPlaying && styles.playSmallBtnActive]}
            >
              <Ionicons
                name={isLoading ? 'hourglass-outline' : isPlaying ? 'stop-circle' : 'volume-medium-outline'}
                size={18}
                color={isPlaying ? colors.white : colors.sakina[600]}
              />
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                learned ? handleUnmarkLearned(item.id) : handleMarkLearned(item.id);
              }}
              hitSlop={8}
            >
              <Ionicons
                name={learned ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={22}
                color={learned ? colors.sakina[600] : colors.midnight[200]}
              />
            </Pressable>
          </View>
        </View>

        {/* Center: Arabic word large */}
        <Text style={styles.wordArabic}>{item.arabic}</Text>
        <Text style={styles.wordBengali}>{item.bengali}</Text>

        {/* Bottom row: stats chips */}
        <View style={styles.wordStatsRow}>
          <View style={styles.statChip}>
            <Ionicons name="pie-chart-outline" size={11} color={colors.sakina[500]} />
            <Text style={styles.statChipText}>{coverageDisplay}%</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="repeat-outline" size={11} color={colors.midnight[400]} />
            <Text style={styles.statChipText}>{item.frequency}বার</Text>
          </View>
          {item.root ? (
            <View style={styles.statChip}>
              <Text style={styles.statChipTextArabic}>{item.root}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }, [vocab.learnedIds, vocab.isLearned, handleWordPress, handleMarkLearned, handleUnmarkLearned, wordAudio]);

  const { stats } = vocab;
  const coveragePct = stats.topCoveragePercent;

  const listHeader = useMemo(() => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>কুরআনের শব্দভান্ডার</Text>
            <Text style={styles.headerSub}>শব্দ শিখুন, কুরআন বুঝুন</Text>
          </View>
          <Pressable
            onPress={() => setShowStats(true)}
            style={styles.infoBtn}
            hitSlop={8}
          >
            <Ionicons name="information-circle-outline" size={26} color={colors.sakina[600]} />
          </Pressable>
        </View>
      </View>

      {/* Coverage hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroStatMain}>
            <Text style={styles.heroPct}>{coveragePct.toFixed(1)}%</Text>
            <Text style={styles.heroLabel}>কুরআন বুঝতে পারবেন</Text>
          </View>
          <View style={styles.heroStatSide}>
            <Text style={styles.heroCount}>{stats.learnedCount}</Text>
            <Text style={styles.heroCountLabel}>শব্দ শিখেছেন</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={styles.progressTrack}
          onLayout={(e: LayoutChangeEvent) => setProgressBarW(e.nativeEvent.layout.width)}
        >
          <View style={[styles.progressFill, { width: progressBarW * (coveragePct / 100) }]} />
        </View>

        {/* Milestone markers */}
        <View style={styles.milestones}>
          <MilestoneMarker pct={25} current={coveragePct} />
          <MilestoneMarker pct={50} current={coveragePct} />
          <MilestoneMarker pct={75} current={coveragePct} />
          <MilestoneMarker pct={100} current={coveragePct} />
        </View>
      </View>
    </>
  ), [coveragePct, stats.learnedCount, progressBarW]);

  return (
    <View style={styles.screen}>
      {/* Fixed search + filter */}
      <View style={styles.searchFilterFixed}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.midnight[300]} />
            <TextInput
              style={styles.searchInput}
              placeholder="শব্দ খুঁজুন..."
              placeholderTextColor={colors.midnight[300]}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => { setSearch(''); vocab.loadWords({ limit: 800 }); }}>
                <Ionicons name="close-circle" size={18} color={colors.midnight[300]} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'unlearned', 'learned'] as FilterMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.filterChip, filter === mode && styles.filterChipActive]}
              onPress={() => setFilter(mode)}
            >
              <Text style={[styles.filterText, filter === mode && styles.filterTextActive]}>
                {mode === 'all' ? 'সব' : mode === 'learned' ? '✓ শেখা' : '○ না শেখা'}
              </Text>
            </Pressable>
          ))}
          <Text style={styles.filterCount}>{filteredWords.length}টি শব্দ</Text>
        </View>
      </View>

      {/* Word list */}
      {vocab.loading && vocab.words.length === 0 ? (
        <ActivityIndicator size="large" color={colors.sakina[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderWord}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* Word Detail Sheet */}
      <WordDetailSheet
        sheetRef={sheetRef}
        wordId={selectedWordId}
        getWordDetail={vocab.getWordDetail}
        getAyahsForWord={vocab.getAyahsForWord}
        isLearned={vocab.isLearned}
        onMarkLearned={vocab.markLearned}
        onUnmarkLearned={vocab.unmarkLearned}
        wordAudio={wordAudio}
      />

      {/* Stats Info Modal */}
      <Modal
        visible={showStats}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStats(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowStats(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 শব্দভান্ডার পরিসংখ্যান</Text>
              <Pressable onPress={() => setShowStats(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.midnight[400]} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Your progress */}
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>আপনার অগ্রগতি</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsGridValue}>{stats.learnedCount}</Text>
                    <Text style={styles.statsGridLabel}>শব্দ শিখেছেন</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsGridValue}>{coveragePct.toFixed(1)}%</Text>
                    <Text style={styles.statsGridLabel}>কুরআন বুঝবেন</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsGridValue}>{stats.totalWords}</Text>
                    <Text style={styles.statsGridLabel}>মোট শব্দ</Text>
                  </View>
                </View>
              </View>

              {/* Coverage brackets */}
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>🔑 শব্দ শিখলে কত% কুরআন বুঝবেন</Text>
                <Text style={styles.statsSectionHint}>
                  কুরআনে মোট ৭৭,৪৩০টি শব্দ আছে। সবচেয়ে বেশি ব্যবহৃত শব্দ আগে শিখলে দ্রুত বুঝতে পারবেন।
                </Text>
                {frequencyBrackets.map((b) => (
                  <View key={b.count} style={styles.bracketRow}>
                    <View style={styles.bracketLeft}>
                      <Ionicons
                        name={stats.learnedCount >= b.count ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={stats.learnedCount >= b.count ? colors.sakina[500] : colors.midnight[200]}
                      />
                      <Text style={styles.bracketWords}>শীর্ষ {b.count}টি শব্দ</Text>
                    </View>
                    <View style={styles.bracketRight}>
                      <View style={styles.bracketBarTrack}>
                        <View style={[styles.bracketBarFill, { width: `${b.coverage}%` }]} />
                      </View>
                      <Text style={styles.bracketPct}>{b.coverage}%</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Motivation */}
              <View style={[styles.statsSection, styles.motivationBox]}>
                <Text style={styles.motivationEmoji}>💡</Text>
                <Text style={styles.motivationText}>
                  কুরআনের সবচেয়ে বেশি ব্যবহৃত মাত্র ৫০০টি শব্দ শিখলেই আপনি প্রায় ৫০% কুরআন বুঝতে পারবেন!
                </Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MilestoneMarker({ pct, current }: { pct: number; current: number }) {
  const reached = current >= pct;
  return (
    <View style={styles.milestone}>
      <Ionicons
        name={reached ? 'star' : 'star-outline'}
        size={14}
        color={reached ? colors.nur[500] : colors.midnight[200]}
      />
      <Text style={[styles.milestoneText, reached && styles.milestoneReached]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.nur[50],
  },
  searchFilterFixed: {
    backgroundColor: colors.nur[50],
    paddingTop: 8,
    zIndex: 1,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 24,
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

  // Hero coverage card
  heroCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.midnight[200],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  heroStatMain: {},
  heroPct: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.sakina[600],
  },
  heroLabel: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[500],
    marginTop: -4,
  },
  heroStatSide: {
    alignItems: 'flex-end',
  },
  heroCount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.nur[600],
  },
  heroCountLabel: {
    fontSize: 12,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  progressTrack: {
    width: '100%',
    height: 12,
    backgroundColor: colors.nur[100],
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.sakina[500],
    borderRadius: 6,
  },
  milestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  milestone: {
    alignItems: 'center',
    gap: 2,
  },
  milestoneText: {
    fontSize: 10,
    color: colors.midnight[300],
    fontWeight: '500',
  },
  milestoneReached: {
    color: colors.nur[600],
    fontWeight: '700',
  },

  // Search
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bengali,
    color: colors.midnight[700],
    padding: 0,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.nur[200],
  },
  filterChipActive: {
    backgroundColor: colors.sakina[50],
    borderColor: colors.sakina[400],
  },
  filterText: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[400],
  },
  filterTextActive: {
    color: colors.sakina[700],
  },
  filterCount: {
    fontSize: 12,
    color: colors.midnight[300],
    marginLeft: 'auto',
  },

  // Word list
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  wordCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  wordTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankBadge: {
    backgroundColor: colors.nur[100],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.midnight[400],
  },
  wordTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordArabic: {
    fontSize: 28,
    fontFamily: fonts.arabic,
    color: colors.midnight[800],
    textAlign: 'center',
    marginBottom: 2,
  },
  wordBengali: {
    fontSize: 15,
    fontFamily: fonts.bengali,
    color: colors.sakina[700],
    textAlign: 'center',
    marginBottom: 10,
  },
  wordStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.nur[50],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statChipText: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[500],
  },
  statChipTextArabic: {
    fontSize: 12,
    fontFamily: fonts.arabic,
    color: colors.midnight[500],
  },
  playSmallBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.sakina[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playSmallBtnActive: {
    backgroundColor: colors.sakina[600],
  },

  // Header row with info button
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sakina[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.nur[100],
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[800],
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsSectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
    marginBottom: 8,
  },
  statsSectionHint: {
    fontSize: 12,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    marginBottom: 12,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statsGridItem: {
    flex: 1,
    backgroundColor: colors.nur[50],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statsGridValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.sakina[600],
  },
  statsGridLabel: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    marginTop: 2,
  },
  bracketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.nur[50],
  },
  bracketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 130,
  },
  bracketWords: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[600],
  },
  bracketRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bracketBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.nur[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  bracketBarFill: {
    height: '100%',
    backgroundColor: colors.sakina[400],
    borderRadius: 4,
  },
  bracketPct: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sakina[600],
    width: 44,
    textAlign: 'right',
  },
  motivationBox: {
    backgroundColor: colors.nur[50],
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  motivationEmoji: {
    fontSize: 24,
  },
  motivationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[600],
    lineHeight: 20,
  },
});
