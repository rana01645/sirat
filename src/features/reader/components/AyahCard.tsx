// src/features/reader/components/AyahCard.tsx
// The most important UI element — displays a single Quranic verse.
// Arabic at highest visual hierarchy, Bengali as understanding layer.
// Actions (tafsir, notes) open bottom sheets — keeps the card clean.
// Karaoke-style text highlight during audio playback.

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Ayah, WordInAyah } from '@/src/types/quran';
import { colors, fonts } from '@/src/shared/lib/theme';
import type { PlaybackState, AudioMode } from '@/src/features/reader/hooks/useAudioPlayer';

interface AyahCardProps {
  ayah: Ayah;
  hasTafsir?: boolean;
  isBookmarked?: boolean;
  wordsForAyah?: WordInAyah[];
  onTafsirPress?: (ayah: Ayah) => void;
  onContextPress?: (ayah: Ayah) => void;
  onNotesPress?: (ayah: Ayah) => void;
  onBookmarkPress?: (ayah: Ayah) => void;
  onWordPress?: (word: WordInAyah, ayah: Ayah) => void;
  onAudioPress?: (ayah: Ayah) => void;
  onAudioLongPress?: (ayah: Ayah) => void;
  audioState?: PlaybackState;
  isCurrentAudio?: boolean;
  audioProgress?: number;
  audioMode?: AudioMode;
  arabicFontSize?: number;
  bengaliFontSize?: number;
}

function AyahCardInner({
  ayah,
  hasTafsir,
  isBookmarked = false,
  wordsForAyah,
  onTafsirPress,
  onContextPress,
  onNotesPress,
  onBookmarkPress,
  onWordPress,
  onAudioPress,
  onAudioLongPress,
  audioState = 'idle',
  isCurrentAudio = false,
  audioProgress = 0,
  audioMode = 'arabic',
  arabicFontSize = 28,
  bengaliFontSize = 17,
}: AyahCardProps) {
  const showAudioActive = isCurrentAudio && (audioState === 'playing' || audioState === 'loading' || audioState === 'paused');
  const isPlaying = isCurrentAudio && audioState === 'playing';

  // Word-based split for karaoke highlight
  // Arabic: char-based works well (RTL combining marks render correctly)
  const arabicSplit = useMemo(() => {
    if (!isPlaying || audioMode !== 'arabic') return ayah.text_uthmani.length;
    return Math.floor(audioProgress * ayah.text_uthmani.length);
  }, [isPlaying, audioMode, audioProgress, ayah.text_uthmani]);

  // Bengali: word-based to avoid breaking grapheme clusters (া, ি, ু, ্)
  const bengaliSplit = useMemo(() => {
    if (!isPlaying || audioMode !== 'bengali') return ayah.text_bengali.length;
    const words = ayah.text_bengali.split(/(\s+)/);
    const totalWords = words.filter(w => w.trim().length > 0).length;
    const targetWordCount = Math.floor(audioProgress * totalWords);

    let wordsSeen = 0;
    let charIndex = 0;
    for (const token of words) {
      if (token.trim().length > 0) {
        wordsSeen++;
        if (wordsSeen > targetWordCount) break;
      }
      charIndex += token.length;
    }
    return charIndex;
  }, [isPlaying, audioMode, audioProgress, ayah.text_bengali]);

  return (
    <View style={[styles.card, showAudioActive && styles.cardAudioActive]}>
      {/* Verse number badge + audio button */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{ayah.verse_number}</Text>
        </View>
        {onAudioPress && (
          <Pressable
            onPress={() => onAudioPress(ayah)}
            onLongPress={() => onAudioLongPress?.(ayah)}
            style={[styles.audioBtn, showAudioActive && styles.audioBtnActive]}
            hitSlop={8}
          >
            {isCurrentAudio && audioState === 'loading' ? (
              <ActivityIndicator size="small" color={colors.sakina[600]} />
            ) : isCurrentAudio && audioState === 'playing' ? (
              <Ionicons name="pause" size={18} color={colors.sakina[700]} />
            ) : isCurrentAudio && audioState === 'paused' ? (
              <Ionicons name="play" size={18} color={colors.sakina[700]} />
            ) : (
              <Ionicons name="volume-medium-outline" size={18} color={colors.midnight[400]} />
            )}
          </Pressable>
        )}
      </View>

      {/* Arabic Text — tappable words when vocabulary data available, karaoke during audio */}
      {wordsForAyah && wordsForAyah.length > 0 && onWordPress && !isPlaying ? (
        <Text
          style={[
            styles.arabicText,
            { fontSize: arabicFontSize, lineHeight: arabicFontSize * 2.4 },
          ]}
        >
          {wordsForAyah.map((word, idx) => (
            <React.Fragment key={`${word.position}-${idx}`}>
              <Text
                onPress={() => onWordPress(word, ayah)}
                style={styles.tappableWord}
              >
                {word.arabic}
              </Text>
              {idx < wordsForAyah.length - 1 ? ' ' : ''}
            </React.Fragment>
          ))}
        </Text>
      ) : (
        <Text
          style={[
            styles.arabicText,
            { fontSize: arabicFontSize, lineHeight: arabicFontSize * 2.4 },
          ]}
        >
          {isPlaying && audioMode === 'arabic' ? (
            <>
              <Text style={styles.textHighlighted}>
                {ayah.text_uthmani.slice(0, arabicSplit)}
              </Text>
              <Text style={styles.textDimmed}>
                {ayah.text_uthmani.slice(arabicSplit)}
              </Text>
            </>
          ) : (
            ayah.text_uthmani
          )}
        </Text>
      )}

      {/* Soft divider */}
      <View style={styles.divider} />

      {/* Bengali Translation — karaoke highlight during Bengali audio */}
      <Text
        style={[
          styles.bengaliText,
          { fontSize: bengaliFontSize, lineHeight: bengaliFontSize * 2 },
        ]}
      >
        {isPlaying && audioMode === 'bengali' ? (
          <>
            <Text style={styles.textHighlightedBn}>
              {ayah.text_bengali.slice(0, bengaliSplit)}
            </Text>
            <Text style={styles.textDimmedBn}>
              {ayah.text_bengali.slice(bengaliSplit)}
            </Text>
          </>
        ) : (
          ayah.text_bengali
        )}
      </Text>

      {/* Action buttons row */}
      <View style={styles.actions}>
        {hasTafsir && onTafsirPress && (
          <Pressable
            onPress={() => onTafsirPress(ayah)}
            style={styles.actionBtn}
          >
            <Ionicons name="book-outline" size={13} color={colors.sakina[700]} />
            <Text style={styles.actionBtnText}>তাফসীর</Text>
          </Pressable>
        )}
        {onContextPress && (
          <Pressable
            onPress={() => onContextPress(ayah)}
            style={[styles.actionBtn, styles.actionBtnContext]}
          >
            <Ionicons name="document-text-outline" size={13} color={colors.nur[700]} />
            <Text style={styles.actionBtnTextContext}>শানে নুযূল</Text>
          </Pressable>
        )}
        {onNotesPress && (
          <Pressable
            onPress={() => onNotesPress(ayah)}
            style={[styles.actionBtn, styles.actionBtnNotes]}
          >
            <Ionicons name="pencil-outline" size={13} color={colors.midnight[500]} />
            <Text style={styles.actionBtnTextNotes}>নোট</Text>
          </Pressable>
        )}
        {onBookmarkPress && (
          <Pressable
            onPress={() => onBookmarkPress(ayah)}
            style={[styles.actionBtn, isBookmarked ? styles.actionBtnBookmarked : styles.actionBtnNotes]}
          >
            <Ionicons
              name={isBookmarked ? 'heart' : 'heart-outline'}
              size={13}
              color={isBookmarked ? '#E05858' : colors.midnight[500]}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Memo: only re-render when props actually change for this card.
// Non-playing cards skip re-renders from 100ms progress updates.
export const AyahCard = React.memo(AyahCardInner, (prev, next) => {
  // Always re-render the currently playing card
  if (next.isCurrentAudio) return false;
  // Re-render if this card just stopped being the active one
  if (prev.isCurrentAudio !== next.isCurrentAudio) return false;
  // Otherwise skip re-render if ayah and static props are the same
  return (
    prev.ayah.id === next.ayah.id &&
    prev.hasTafsir === next.hasTafsir &&
    prev.isBookmarked === next.isBookmarked &&
    prev.audioState === next.audioState &&
    prev.arabicFontSize === next.arabicFontSize &&
    prev.bengaliFontSize === next.bengaliFontSize
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: colors.midnight[200],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAudioActive: {
    borderWidth: 1.5,
    borderColor: colors.sakina[300],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.nur[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.nur[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBtnActive: {
    backgroundColor: colors.sakina[100],
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bengaliMedium,
    color: colors.nur[600],
  },
  arabicText: {
    textAlign: 'center',
    color: colors.midnight[800],
    marginBottom: 28,
    fontFamily: fonts.arabic,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.nur[200],
    marginHorizontal: 16,
    marginBottom: 24,
  },
  bengaliText: {
    color: colors.midnight[600],
    marginBottom: 20,
    fontFamily: fonts.bengali,
  },
  // Karaoke highlight styles
  textHighlighted: {
    color: colors.sakina[700],
  },
  textDimmed: {
    color: colors.midnight[300],
  },
  textHighlightedBn: {
    color: colors.sakina[700],
  },
  textDimmedBn: {
    color: colors.midnight[300],
  },
  tappableWord: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: colors.nur[300],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: colors.sakina[50],
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.sakina[700],
  },
  actionBtnNotes: {
    backgroundColor: colors.nur[100],
  },
  actionBtnContext: {
    backgroundColor: colors.nur[50],
  },
  actionBtnTextContext: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.nur[700],
  },
  actionBtnBookmarked: {
    backgroundColor: '#FDE8E8',
  },
  actionBtnTextNotes: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.nur[700],
  },
});
