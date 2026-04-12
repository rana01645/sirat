import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, type ViewToken } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import { useSurahReader, useSurahList } from '@/src/features/reader/hooks/useSurahReader';
import { useReadingProgress } from '@/src/features/reader/hooks/useReadingProgress';
import { useAudioPlayer, ARABIC_RECITERS, type AudioMode, type ReciterId } from '@/src/features/reader/hooks/useAudioPlayer';
import { useBookmarks } from '@/src/features/reader/hooks/useBookmarks';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { useVocabulary } from '@/src/features/vocabulary/hooks/useVocabulary';
import { useSurahWords } from '@/src/features/vocabulary/hooks/useSurahWords';
import { useWordAudio } from '@/src/features/vocabulary/hooks/useWordAudio';
import { WordDetailSheet } from '@/src/features/vocabulary/components/WordDetailSheet';
import { useGamificationStore, COIN_REWARDS } from '@/src/shared/stores/gamificationStore';
import { useGamificationSync } from '@/src/features/gamification/hooks/useGamificationSync';
import { CoinPopup, type CoinPopupRef } from '@/src/features/gamification/components/CoinPopup';
import { AyahCard } from '@/src/features/reader/components/AyahCard';
import { SurahPicker } from '@/src/features/reader/components/SurahPicker';
import { TafsirSheet } from '@/src/features/reader/components/TafsirSheet';
import { NotesSheet } from '@/src/features/reader/components/NotesSheet';
import { ContextSheet } from '@/src/features/reader/components/ContextSheet';
import { useContextTafsir } from '@/src/features/reader/hooks/useContextTafsir';
import { FadeInView } from '@/src/shared/components/FadeInView';
import { colors, fonts, spacing, STATUS_BAR_OFFSET } from '@/src/shared/lib/theme';
import type { Ayah, WordInAyah } from '@/src/types/quran';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ surahId?: string }>();
  const [currentSurahId, setCurrentSurahId] = useState(1);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const flatListRef = useRef<FlatList<Ayah>>(null);
  const tafsirSheetRef = useRef<BottomSheetModalRef>(null);
  const notesSheetRef = useRef<BottomSheetModalRef>(null);
  const contextSheetRef = useRef<BottomSheetModalRef>(null);
  const coinPopupRef = useRef<CoinPopupRef | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const contextTafsir = useContextTafsir();
  const readAyahIds = useRef(new Set<number>());
  const pendingScrollAyahId = useRef<number | null>(null);
  const hasScrolledToResume = useRef(false);
  const { db } = useDatabaseContext();

  // Navigate to surah from route params (e.g. from Profile)
  useEffect(() => {
    if (params.surahId) {
      const id = parseInt(params.surahId, 10);
      if (id >= 1 && id <= 114) {
        setCurrentSurahId(id);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [params.surahId]);

  // Restore last read position + load today's already-read ayah IDs
  useEffect(() => {
    if (initialLoaded) return;
    (async () => {
      try {
        // 1. Restore last surah + ayah (only if no route param)
        if (!params.surahId) {
          const lastPos = await db.getFirstAsync<{ current_surah_id: number; current_ayah_id: number }>(
            'SELECT current_surah_id, current_ayah_id FROM user_progress WHERE id = 1'
          );
          if (lastPos?.current_surah_id && lastPos.current_surah_id >= 1 && lastPos.current_surah_id <= 114) {
            setCurrentSurahId(lastPos.current_surah_id);
            if (lastPos.current_ayah_id && lastPos.current_ayah_id > 0) {
              pendingScrollAyahId.current = lastPos.current_ayah_id;
            }
          }
        }

        // 2. Load today's already-read ayah IDs to prevent double-counting
        const today = new Date().toISOString().split('T')[0];
        const rows = await db.getAllAsync<{ ayah_id: number }>(
          'SELECT ayah_id FROM reading_history WHERE read_date = ?',
          [today]
        );
        for (const row of rows) {
          readAyahIds.current.add(row.ayah_id);
        }
      } catch (err) {
        console.error('[Reader] restore position error:', err);
      } finally {
        setInitialLoaded(true);
      }
    })();
  }, [db, params.surahId, initialLoaded]);

  const { surah, ayahs, tafsirs, isLoading, error } = useSurahReader(currentSurahId);
  const { surahs } = useSurahList();

  // Scroll to last-read ayah once ayahs load
  useEffect(() => {
    if (!ayahs.length || !pendingScrollAyahId.current || hasScrolledToResume.current) return;
    const targetId = pendingScrollAyahId.current;
    const idx = ayahs.findIndex((a) => a.id === targetId);
    if (idx > 0) {
      hasScrolledToResume.current = true;
      pendingScrollAyahId.current = null;
      // Small delay to let FlatList measure
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false, viewOffset: 0 });
      }, 150);
    }
    // Don't clear pendingScrollAyahId if not found — ayahs for the correct surah may still be loading
  }, [ayahs]);
  const { recordAyahRead: recordToHistory, flush: flushHistory } = useReadingProgress();
  const audio = useAudioPlayer(ayahs);
  const { bookmarkedIds, isBookmarked, toggleBookmark } = useBookmarks();
  const vocab = useVocabulary();
  const { wordsMap } = useSurahWords(currentSurahId);
  const wordAudio = useWordAudio(db);
  const wordDetailSheetRef = useRef<BottomSheetModalRef>(null);
  const [selectedWord, setSelectedWord] = useState<WordInAyah | null>(null);
  const [showAudioModes, setShowAudioModes] = useState(false);
  const [showReciterPicker, setShowReciterPicker] = useState(false);

  const markAyahRead = useGamificationStore((s) => s.markAyahRead);
  const markTafsirRead = useGamificationStore((s) => s.markTafsirRead);
  const markNoteWritten = useGamificationStore((s) => s.markNoteWritten);
  const completeDailyGoal = useGamificationStore((s) => s.completeDailyGoal);
  const dailyProgress = useGamificationStore((s) => s.dailyProgress);
  const dailyGoalAyahs = useGamificationStore((s) => s.dailyGoalAyahs);
  const { persistState } = useGamificationSync();

  // Track viewed ayahs via viewability
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const ayah = token.item as Ayah;
      if (ayah && !readAyahIds.current.has(ayah.id)) {
        readAyahIds.current.add(ayah.id);
        markAyahRead();
        recordToHistory(ayah.id, ayah.surah_id, ayah.verse_number);

        // Check if daily goal just completed
        const newCount = useGamificationStore.getState().dailyProgress.ayahsRead;
        if (newCount >= dailyGoalAyahs && !useGamificationStore.getState().dailyProgress.goalCompleted) {
          completeDailyGoal();
          coinPopupRef.current?.show(COIN_REWARDS.DAILY_GOAL_COMPLETE, 'দৈনিক লক্ষ্য!');
          persistState();
        }
      }
    }
  }, [markAyahRead, completeDailyGoal, dailyGoalAyahs, persistState, recordToHistory]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 1500 }).current;

  const handleTafsirPress = useCallback((ayah: Ayah) => {
    setSelectedAyah(ayah);
    notesSheetRef.current?.close();
    tafsirSheetRef.current?.open();
    markTafsirRead();
    coinPopupRef.current?.show(COIN_REWARDS.TAFSIR_READ, 'তাফসীর');
    persistState();
  }, [markTafsirRead, persistState]);

  const handleNotesPress = useCallback((ayah: Ayah) => {
    setSelectedAyah(ayah);
    tafsirSheetRef.current?.close();
    contextSheetRef.current?.close();
    notesSheetRef.current?.open();
  }, []);

  const handleContextPress = useCallback((ayah: Ayah) => {
    setSelectedAyah(ayah);
    contextSheetRef.current?.open();
    contextTafsir.fetchContext(ayah.surah_id, ayah.verse_number);
  }, [contextTafsir.fetchContext]);

  // Called from NotesSheet after save
  const handleNoteSaved = useCallback(() => {
    markNoteWritten();
    coinPopupRef.current?.show(COIN_REWARDS.NOTE_WRITTEN, 'নোট');
    persistState();
  }, [markNoteWritten, persistState]);

  // Audio handlers
  const handleAudioPress = useCallback((ayah: Ayah) => {
    if (audio.currentAyahId === ayah.id) {
      // Toggle pause/stop on current ayah
      if (audio.playbackState === 'playing' || audio.playbackState === 'paused') {
        audio.togglePause();
      } else {
        audio.playAyah(ayah);
      }
    } else {
      audio.playAyah(ayah);
    }
  }, [audio]);

  const handleAudioLongPress = useCallback((ayah: Ayah) => {
    // Long press: play sequentially from this ayah
    audio.playSequential(ayah);
  }, [audio]);

  const handleBookmarkPress = useCallback((ayah: Ayah) => {
    toggleBookmark(ayah.id);
  }, [toggleBookmark]);

  const handleWordPress = useCallback((word: WordInAyah, _ayah: Ayah) => {
    setSelectedWord(word);
    wordDetailSheetRef.current?.open();
  }, []);

  // Stop audio on surah change
  const handleSurahSelect = useCallback((id: number) => {
    audio.stop();
    flushHistory();
    setCurrentSurahId(id);
    setPickerVisible(false);
    hasScrolledToResume.current = false;
    pendingScrollAyahId.current = null;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [flushHistory, audio]);

  const goToPrev = useCallback(() => {
    if (currentSurahId > 1) {
      setCurrentSurahId((prev) => prev - 1);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [currentSurahId]);

  const goToNext = useCallback(() => {
    if (currentSurahId < 114) {
      setCurrentSurahId((prev) => prev + 1);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [currentSurahId]);

  const listHeader = useMemo(() => {
    if (!surah) return null;
    return (
      <FadeInView style={styles.surahHeader}>
        <Text style={styles.surahArabic}>{surah.name_arabic}</Text>
        <Text style={styles.surahBengali}>{surah.name_bengali}</Text>
        <Text style={styles.surahMeta}>
          {surah.revelation_place === 'makkah' ? 'মাক্কী' : 'মাদানী'} • {surah.verses_count} আয়াত
        </Text>
        {surah.id !== 9 && (
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
        )}
      </FadeInView>
    );
  }, [surah]);

  const listFooter = useMemo(() => (
    <View style={styles.footer}>
      {currentSurahId > 1 && (
        <Pressable onPress={goToPrev} style={styles.navFooterBtn}>
          <Text style={styles.navFooterArrow}>←</Text>
          <Text style={styles.navFooterLabel}>পূর্ববর্তী সূরা</Text>
        </Pressable>
      )}
      <View style={styles.footerSpacer} />
      {currentSurahId < 114 && (
        <Pressable onPress={goToNext} style={styles.navFooterBtn}>
          <Text style={styles.navFooterLabel}>পরবর্তী সূরা</Text>
          <Text style={styles.navFooterArrow}>→</Text>
        </Pressable>
      )}
    </View>
  ), [currentSurahId, goToPrev, goToNext]);

  const renderAyah = useCallback(({ item }: { item: Ayah }) => {
    const verseKey = `${item.surah_id}:${item.verse_number}`;
    return (
      <AyahCard
        ayah={item}
        hasTafsir={tafsirs.has(verseKey)}
        isBookmarked={isBookmarked(item.id)}
        wordsForAyah={wordsMap.get(item.id)}
        onTafsirPress={handleTafsirPress}
        onContextPress={handleContextPress}
        onNotesPress={handleNotesPress}
        onBookmarkPress={handleBookmarkPress}
        onWordPress={handleWordPress}
        onAudioPress={handleAudioPress}
        onAudioLongPress={handleAudioLongPress}
        audioState={audio.playbackState}
        isCurrentAudio={audio.currentAyahId === item.id}
        audioProgress={audio.audioProgress}
        audioMode={audio.audioMode}
      />
    );
  }, [tafsirs, bookmarkedIds, isBookmarked, wordsMap, handleTafsirPress, handleContextPress, handleNotesPress, handleBookmarkPress, handleWordPress, handleAudioPress, handleAudioLongPress, audio.playbackState, audio.currentAyahId, audio.audioProgress, audio.audioMode]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>পড়া হচ্ছে...</Text>
      </View>
    );
  }

  if (error || !surah) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>তথ্য লোড করতে সমস্যা হয়েছে</Text>
      </View>
    );
  }

  const selectedVerseKey = selectedAyah
    ? `${selectedAyah.surah_id}:${selectedAyah.verse_number}`
    : '';

  return (
    <View style={styles.screen}>
      {/* Navigation header bar */}
      <View style={styles.navBar}>
        <Pressable
          onPress={goToPrev}
          style={[styles.navBtn, currentSurahId <= 1 && styles.navBtnDisabled]}
          disabled={currentSurahId <= 1}
        >
          <Text style={[styles.navArrow, currentSurahId <= 1 && styles.navArrowDisabled]}>‹</Text>
        </Pressable>

        <Pressable onPress={() => setPickerVisible(true)} style={styles.navCenter}>
          <Text style={styles.navTitle}>{surah.name_arabic}</Text>
          <Text style={styles.navSubtitle}>{surah.name_bengali} ▾</Text>
        </Pressable>

        <Pressable
          onPress={goToNext}
          style={[styles.navBtn, currentSurahId >= 114 && styles.navBtnDisabled]}
          disabled={currentSurahId >= 114}
        >
          <Text style={[styles.navArrow, currentSurahId >= 114 && styles.navArrowDisabled]}>›</Text>
        </Pressable>
      </View>

      {/* Audio mode bar */}
      <View style={styles.audioBar}>
        <View style={styles.audioModeRow}>
          {(['arabic', 'bengali'] as AudioMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => audio.setAudioMode(mode)}
              style={[styles.audioModeBtn, audio.audioMode === mode && styles.audioModeBtnActive]}
            >
              <Text style={[styles.audioModeText, audio.audioMode === mode && styles.audioModeTextActive]}>
                {mode === 'arabic' ? 'আরবি তেলাওয়াত' : 'বাংলা অনুবাদ'}
              </Text>
            </Pressable>
          ))}
        </View>
        {audio.audioMode === 'arabic' && (
          <Pressable onPress={() => setShowReciterPicker(true)} style={styles.reciterBtn} hitSlop={8}>
            <Ionicons name="person-circle-outline" size={20} color={colors.sakina[600]} />
          </Pressable>
        )}
        {audio.playbackState !== 'idle' && (
          <Pressable onPress={() => audio.stop()} style={styles.stopBtn} hitSlop={8}>
            <Ionicons name="stop" size={16} color={colors.white} />
          </Pressable>
        )}
      </View>

      {/* Ayah list */}
      <FlatList
        ref={flatListRef}
        data={ayahs}
        renderItem={renderAyah}
        keyExtractor={(item) => `ayah-${item.id}`}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={(info) => {
          // Retry after layout settles
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 300);
        }}
      />

      {/* Surah picker modal */}
      <SurahPicker
        visible={pickerVisible}
        surahs={surahs}
        currentSurahId={currentSurahId}
        onSelect={handleSurahSelect}
        onClose={() => setPickerVisible(false)}
      />

      {/* Tafsir bottom sheet */}
      <TafsirSheet
        sheetRef={tafsirSheetRef}
        verseKey={selectedVerseKey}
        arabicText={selectedAyah?.text_uthmani ?? ''}
        tafsirText={tafsirs.get(selectedVerseKey) ?? ''}
      />

      {/* Notes bottom sheet */}
      <NotesSheet
        sheetRef={notesSheetRef}
        ayahId={selectedAyah?.id ?? 0}
        verseKey={selectedVerseKey}
        onSaved={handleNoteSaved}
      />

      {/* Context / Ibn Kathir bottom sheet */}
      <ContextSheet
        sheetRef={contextSheetRef}
        loading={contextTafsir.loading}
        contextData={contextTafsir.contextData}
      />

      {/* Word detail bottom sheet */}
      <WordDetailSheet
        sheetRef={wordDetailSheetRef}
        wordId={selectedWord?.wordId ?? null}
        getWordDetail={vocab.getWordDetail}
        getAyahsForWord={vocab.getAyahsForWord}
        isLearned={vocab.isLearned}
        onMarkLearned={vocab.markLearned}
        onUnmarkLearned={vocab.unmarkLearned}
        wordAudio={wordAudio}
      />

      {/* Coin popup overlay */}
      <CoinPopup popupRef={coinPopupRef} />

      {/* Reciter picker modal */}
      {showReciterPicker && (
        <Pressable style={styles.reciterOverlay} onPress={() => setShowReciterPicker(false)}>
          <View style={styles.reciterModal}>
            <Text style={styles.reciterTitle}>ক্বারী নির্বাচন করুন</Text>
            {ARABIC_RECITERS.map((reciter) => (
              <Pressable
                key={reciter.id}
                style={[styles.reciterItem, audio.arabicReciter === reciter.id && styles.reciterItemActive]}
                onPress={() => {
                  audio.setArabicReciter(reciter.id);
                  setShowReciterPicker(false);
                }}
              >
                <View style={styles.reciterInfo}>
                  <Text style={[styles.reciterName, audio.arabicReciter === reciter.id && styles.reciterNameActive]}>
                    {reciter.name}
                  </Text>
                  <Text style={styles.reciterEnglish}>{reciter.englishName}</Text>
                </View>
                {audio.arabicReciter === reciter.id && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.sakina[600]} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.nur[50],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.nur[50],
  },
  loadingText: {
    fontSize: 18,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },

  // Navigation header
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: STATUS_BAR_OFFSET,
    paddingBottom: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.nur[200],
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.nur[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navArrow: {
    fontSize: 24,
    color: colors.midnight[600],
    fontWeight: '600',
  },
  navArrowDisabled: {
    color: colors.midnight[300],
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  navTitle: {
    fontSize: 22,
    fontFamily: fonts.arabic,
    color: colors.midnight[800],
  },
  navSubtitle: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[600],
    marginTop: 2,
  },

  // Audio mode bar
  audioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.nur[200],
    gap: 8,
  },
  audioModeRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.nur[100],
    borderRadius: 10,
    padding: 3,
  },
  audioModeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  audioModeBtnActive: {
    backgroundColor: colors.white,
    shadowColor: colors.midnight[200],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  audioModeText: {
    fontSize: 12,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[400],
  },
  audioModeTextActive: {
    color: colors.sakina[700],
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.midnight[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sakina[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Reciter picker modal
  reciterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  reciterModal: {
    width: '85%',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  reciterTitle: {
    fontSize: 17,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[800],
    textAlign: 'center',
    marginBottom: 16,
  },
  reciterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  reciterItemActive: {
    backgroundColor: colors.sakina[50],
  },
  reciterInfo: {
    flex: 1,
  },
  reciterName: {
    fontSize: 15,
    fontFamily: fonts.bengali,
    color: colors.midnight[700],
  },
  reciterNameActive: {
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[700],
  },
  reciterEnglish: {
    fontSize: 12,
    color: colors.midnight[400],
    marginTop: 1,
  },

  // Surah header (in-list)
  surahHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  surahArabic: {
    fontSize: 36,
    fontFamily: fonts.arabic,
    color: colors.midnight[800],
    marginBottom: 8,
  },
  surahBengali: {
    fontSize: 18,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[500],
    marginBottom: 4,
  },
  surahMeta: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
    marginBottom: 24,
  },
  bismillah: {
    fontSize: 26,
    fontFamily: fonts.arabic,
    color: colors.sakina[700],
    textAlign: 'center',
    lineHeight: 52,
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },

  // Footer navigation
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footerSpacer: {
    flex: 1,
  },
  navFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 8,
  },
  navFooterArrow: {
    fontSize: 18,
    color: colors.sakina[600],
    fontFamily: fonts.bengaliMedium,
  },
  navFooterLabel: {
    fontSize: 14,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[700],
  },
});
