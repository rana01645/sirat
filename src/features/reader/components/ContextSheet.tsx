// ContextSheet — শানে নুযূল (Revelation Context from Ibn Kathir)
// Shows the backstory, hadiths, and historical context behind each ayah.
// Different from tafsir (Ahsanul Bayaan) which explains the meaning.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, type BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import { MixedText } from '@/src/shared/components/MixedText';
import { colors, fonts, spacing } from '@/src/shared/lib/theme';
import type { ContextData } from '@/src/features/reader/hooks/useContextTafsir';

interface ContextSheetProps {
  sheetRef: React.RefObject<BottomSheetModalRef | null>;
  loading: boolean;
  contextData: ContextData | null;
}

export function ContextSheet({
  sheetRef,
  loading,
  contextData,
}: ContextSheetProps) {
  return (
    <BottomSheetModal ref={sheetRef} heightFraction={0.75}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>📜</Text>
            <Text style={styles.headerLabel}>শানে নুযূল</Text>
          </View>
          {contextData && (
            <Text style={styles.verseRef}>আয়াত {contextData.verseKey}</Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.sakina[500]} />
            <Text style={styles.loadingText}>ইতিহাস খোঁজা হচ্ছে...</Text>
          </View>
        ) : contextData ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Story card */}
            <View style={styles.storyCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>🕌</Text>
                <Text style={styles.sectionTitle}>ঐতিহাসিক প্রেক্ষাপট</Text>
              </View>
              <MixedText style={styles.storyText}>{contextData.nuzulStory}</MixedText>
            </View>

            {/* Source */}
            <View style={styles.sourceRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.midnight[300]} />
              <Text style={styles.sourceText}>সূত্র: {contextData.source}</Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>তথ্য পাওয়া যায়নি</Text>
          </View>
        )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerLabel: {
    fontSize: 17,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[700],
  },
  verseRef: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[300],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  storyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.sakina[400],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[700],
  },
  storyText: {
    fontSize: 15,
    fontFamily: fonts.bengali,
    color: colors.midnight[600],
    lineHeight: 28,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  sourceText: {
    fontSize: 12,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
});
