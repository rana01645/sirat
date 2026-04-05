// WordDetailSheet — Bottom sheet showing word meaning, root, frequency, and link to all ayahs.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, type BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import type { Word, AyahWithSurah } from '@/src/types/quran';
import { colors, fonts } from '@/src/shared/lib/theme';
import type { useWordAudio } from '@/src/features/vocabulary/hooks/useWordAudio';

export interface WordDetailSheetRef {
  show: (wordId: number) => void;
}

interface WordDetailSheetProps {
  sheetRef: React.RefObject<BottomSheetModalRef | null>;
  wordId: number | null;
  getWordDetail: (wordId: number) => Promise<Word | null>;
  getAyahsForWord: (wordId: number) => Promise<AyahWithSurah[]>;
  isLearned: (wordId: number) => boolean;
  onMarkLearned: (wordId: number) => void;
  onUnmarkLearned: (wordId: number) => void;
  onNavigateToSurah?: (surahId: number) => void;
  wordAudio?: ReturnType<typeof useWordAudio>;
}

export function WordDetailSheet({
  sheetRef,
  wordId: propWordId,
  getWordDetail,
  getAyahsForWord,
  isLearned,
  onMarkLearned,
  onUnmarkLearned,
  onNavigateToSurah,
  wordAudio,
}: WordDetailSheetProps) {
  const [wordDetail, setWordDetail] = useState<Word | null>(null);
  const [ayahs, setAyahs] = useState<AyahWithSurah[]>([]);
  const [showAyahs, setShowAyahs] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load word when propWordId changes
  useEffect(() => {
    if (!propWordId) return;
    setShowAyahs(false);
    setAyahs([]);
    setLoading(true);
    getWordDetail(propWordId).then((detail) => {
      setWordDetail(detail);
      setLoading(false);
    }).catch((err) => {
      console.error('[WordDetail] load error:', err);
      setLoading(false);
    });
  }, [propWordId, getWordDetail]);

  const handleShowAyahs = useCallback(async () => {
    if (!propWordId) return;
    setLoading(true);
    try {
      const results = await getAyahsForWord(propWordId);
      setAyahs(results);
      setShowAyahs(true);
    } catch (err) {
      console.error('[WordDetail] loadAyahs error:', err);
    } finally {
      setLoading(false);
    }
  }, [propWordId, getAyahsForWord]);

  const learned = propWordId ? isLearned(propWordId) : false;

  const handleToggleLearned = useCallback(() => {
    if (!propWordId) return;
    if (learned) {
      onUnmarkLearned(propWordId);
    } else {
      onMarkLearned(propWordId);
    }
  }, [propWordId, learned, onMarkLearned, onUnmarkLearned]);

  return (
    <BottomSheetModal ref={sheetRef} heightFraction={showAyahs ? 0.85 : 0.45}>
      <View style={styles.container}>
        {loading && !wordDetail ? (
          <ActivityIndicator size="large" color={colors.sakina[500]} style={{ marginTop: 40 }} />
        ) : wordDetail ? (
          <>
            {/* Word header with play button */}
            <Text style={styles.arabicWord}>{wordDetail.arabic}</Text>

            {wordAudio && propWordId && (
              <Pressable
                style={styles.playBtn}
                onPress={() => {
                  if (wordAudio.playingWordId === propWordId && wordAudio.audioState === 'playing') {
                    wordAudio.stopWord();
                  } else {
                    wordAudio.playWord(propWordId);
                  }
                }}
              >
                <Ionicons
                  name={
                    wordAudio.audioState === 'loading' && wordAudio.playingWordId === propWordId
                      ? 'hourglass-outline'
                      : wordAudio.playingWordId === propWordId && wordAudio.audioState === 'playing'
                        ? 'stop-circle'
                        : 'volume-high'
                  }
                  size={22}
                  color={colors.sakina[600]}
                />
                <Text style={styles.playBtnText}>উচ্চারণ শুনুন</Text>
              </Pressable>
            )}

            <Text style={styles.bengaliMeaning}>{wordDetail.bengali}</Text>

            {wordDetail.english ? (
              <Text style={styles.englishMeaning}>{wordDetail.english}</Text>
            ) : null}

            {/* Meta row */}
            <View style={styles.metaRow}>
              {wordDetail.root ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaLabel}>মূল</Text>
                  <Text style={styles.metaValue}>{wordDetail.root}</Text>
                </View>
              ) : null}
              <View style={styles.metaChip}>
                <Text style={styles.metaLabel}>র‍্যাংক</Text>
                <Text style={styles.metaValue}>#{wordDetail.rank}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaLabel}>বার</Text>
                <Text style={styles.metaValue}>{wordDetail.frequency}x</Text>
              </View>
            </View>

            {/* Coverage motivation */}
            {!learned && (
              <View style={styles.coverageMotivation}>
                <Ionicons name="sparkles" size={16} color={colors.nur[500]} />
                <Text style={styles.coverageMotivationText}>
                  এই শব্দ শিখলে কুরআনের আরো {((wordDetail.frequency / 77430) * 100).toFixed(1)}% বুঝবেন
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <Pressable style={styles.learnedBtn} onPress={handleToggleLearned}>
                <Ionicons
                  name={learned ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={20}
                  color={learned ? colors.sakina[600] : colors.midnight[400]}
                />
                <Text style={[styles.learnedBtnText, learned && styles.learnedBtnTextActive]}>
                  {learned ? 'শিখেছি' : 'শিখেছি হিসেবে চিহ্নিত করুন'}
                </Text>
              </Pressable>

              {!showAyahs && (
                <Pressable style={styles.showAyahsBtn} onPress={handleShowAyahs}>
                  <Ionicons name="list-outline" size={18} color={colors.sakina[700]} />
                  <Text style={styles.showAyahsBtnText}>
                    সব আয়াত দেখুন ({wordDetail.frequency})
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Ayahs list */}
            {showAyahs && (
              <View style={styles.ayahsList}>
                <Text style={styles.ayahsHeader}>
                  "{wordDetail.arabic}" — {ayahs.length}টি আয়াতে আছে
                </Text>
                <FlatList
                  data={ayahs}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.ayahRow}
                      onPress={() => onNavigateToSurah?.(item.surah_id)}
                    >
                      <Text style={styles.ayahRef}>
                        {item.surah_name_bengali} {item.surah_id}:{item.verse_number}
                      </Text>
                      <Text style={styles.ayahArabic} numberOfLines={1}>
                        {item.text_uthmani}
                      </Text>
                      <Text style={styles.ayahBengali} numberOfLines={1}>
                        {item.text_bengali}
                      </Text>
                    </Pressable>
                  )}
                  showsVerticalScrollIndicator={false}
                  style={styles.ayahsFlatList}
                />
              </View>
            )}
          </>
        ) : null}
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    flex: 1,
  },
  arabicWord: {
    fontSize: 42,
    fontFamily: fonts.arabic,
    color: colors.midnight[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.sakina[50],
    alignSelf: 'center',
    marginBottom: 8,
  },
  playBtnText: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[600],
  },
  bengaliMeaning: {
    fontSize: 20,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[700],
    textAlign: 'center',
    marginBottom: 4,
  },
  englishMeaning: {
    fontSize: 14,
    color: colors.midnight[400],
    textAlign: 'center',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  metaChip: {
    backgroundColor: colors.nur[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.midnight[700],
  },
  coverageMotivation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.nur[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  coverageMotivationText: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.nur[700],
    flex: 1,
  },
  actionRow: {
    gap: 10,
    marginBottom: 16,
  },
  learnedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.sakina[50],
  },
  learnedBtnText: {
    fontSize: 14,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[400],
  },
  learnedBtnTextActive: {
    color: colors.sakina[700],
  },
  showAyahsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.nur[100],
  },
  showAyahsBtnText: {
    fontSize: 14,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[700],
  },
  ayahsList: {
    flex: 1,
  },
  ayahsHeader: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[500],
    marginBottom: 12,
  },
  ayahsFlatList: {
    flex: 1,
  },
  ayahRow: {
    backgroundColor: colors.nur[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  ayahRef: {
    fontSize: 11,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[600],
    marginBottom: 6,
  },
  ayahArabic: {
    fontSize: 18,
    fontFamily: fonts.arabic,
    color: colors.midnight[700],
    textAlign: 'right',
    marginBottom: 4,
  },
  ayahBengali: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[500],
  },
});
