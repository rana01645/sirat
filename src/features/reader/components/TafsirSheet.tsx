// src/features/reader/components/TafsirSheet.tsx
// Bottom sheet modal for displaying tafsir (Ahsanul Bayaan).
// Clean, Clear Quran-style footnotes with gentle slide-up animation.
// Uses pure-JS BottomSheetModal — no native modules needed.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { BottomSheetModal, type BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import { MixedText } from '@/src/shared/components/MixedText';
import { colors, fonts, spacing } from '@/src/shared/lib/theme';

interface TafsirSheetProps {
  sheetRef: React.RefObject<BottomSheetModalRef | null>;
  verseKey: string;
  arabicText: string;
  tafsirText: string;
}

export function TafsirSheet({
  sheetRef,
  verseKey,
  arabicText,
  tafsirText,
}: TafsirSheetProps) {
  return (
    <BottomSheetModal ref={sheetRef} heightFraction={0.75}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>তাফসীর আহসানুল বায়ান</Text>
          <Text style={styles.verseRef}>আয়াত {verseKey}</Text>
        </View>

        {/* Arabic verse reference */}
        <View style={styles.arabicContainer}>
          <Text style={styles.arabicText} numberOfLines={2}>
            {arabicText}
          </Text>
        </View>

        {/* Tafsir content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MixedText style={styles.tafsirText}>{tafsirText}</MixedText>
        </ScrollView>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.nur[200],
  },
  headerLabel: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[700],
  },
  verseRef: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[300],
  },
  arabicContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.nur[200],
  },
  arabicText: {
    fontSize: 22,
    fontFamily: fonts.arabic,
    color: colors.midnight[700],
    textAlign: 'center',
    lineHeight: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  tafsirText: {
    fontSize: 16,
    fontFamily: fonts.bengali,
    color: colors.midnight[600],
    lineHeight: 30,
  },
});
