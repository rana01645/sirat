// app/(tabs)/vocabulary.tsx
// Dedicated vocabulary learning tab — shows coverage stats and word list.
// Core motivator: "এই শব্দ শিখলে কুরআনের আরো X% বুঝবেন"

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
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
        <Text style={styles.headerTitle}>কুরআনের শব্দভান্ডার</Text>
        <Text style={styles.headerSub}>শব্দ শিখুন, কুরআন বুঝুন</Text>
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
});
