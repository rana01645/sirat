// src/features/reader/components/SurahPicker.tsx
// Full-screen modal to browse and search all 114 surahs.
// Sukoon design: gentle fade, earthy tones, clean typography.

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/src/shared/lib/theme';
import type { Surah } from '@/src/types/quran';

interface SurahPickerProps {
  visible: boolean;
  surahs: Surah[];
  currentSurahId: number;
  onSelect: (surahId: number) => void;
  onClose: () => void;
}

// Convert Western digits to Bengali digits for verse counts
function toBengaliDigits(n: number): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(n)
    .split('')
    .map((d) => bengaliDigits[Number(d)] ?? d)
    .join('');
}

export function SurahPicker({
  visible,
  surahs,
  currentSurahId,
  onSelect,
  onClose,
}: SurahPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return surahs;
    const q = search.trim().toLowerCase();
    return surahs.filter(
      (s) =>
        s.name_arabic.includes(q) ||
        s.name_bengali.toLowerCase().includes(q) ||
        String(s.id) === q
    );
  }, [surahs, search]);

  const handleSelect = useCallback(
    (id: number) => {
      setSearch('');
      onSelect(id);
    },
    [onSelect]
  );

  const renderSurah = useCallback(
    ({ item }: { item: Surah }) => {
      const isActive = item.id === currentSurahId;
      return (
        <Pressable
          onPress={() => handleSelect(item.id)}
          style={[styles.row, isActive && styles.rowActive]}
        >
          {/* Surah number */}
          <View style={[styles.numberBadge, isActive && styles.numberBadgeActive]}>
            <Text style={[styles.numberText, isActive && styles.numberTextActive]}>
              {item.id}
            </Text>
          </View>

          {/* Names & meta */}
          <View style={styles.rowCenter}>
            <Text style={styles.rowBengali}>{item.name_bengali}</Text>
            <Text style={styles.rowMeta}>
              {item.revelation_place === 'makkah' ? 'মাক্কী' : 'মাদানী'} •{' '}
              {toBengaliDigits(item.verses_count)} আয়াত
            </Text>
          </View>

          {/* Arabic name */}
          <Text style={styles.rowArabic}>{item.name_arabic}</Text>
        </Pressable>
      );
    },
    [currentSurahId, handleSelect]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>সূরা নির্বাচন</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="সূরার নাম বা নম্বর খুঁজুন..."
            placeholderTextColor={colors.midnight[300]}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Surah list */}
        <FlatList
          data={filtered}
          renderItem={renderSurah}
          keyExtractor={(item) => `surah-${item.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>কোনো সূরা পাওয়া যায়নি</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.nur[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[800],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.nur[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.midnight[500],
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.bengali,
    color: colors.midnight[700],
    shadowColor: colors.midnight[200],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowActive: {
    backgroundColor: colors.sakina[50],
    borderWidth: 1,
    borderColor: colors.sakina[200],
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.nur[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  numberBadgeActive: {
    backgroundColor: colors.sakina[100],
  },
  numberText: {
    fontSize: 14,
    fontFamily: fonts.bengaliMedium,
    color: colors.nur[700],
  },
  numberTextActive: {
    color: colors.sakina[700],
  },
  rowCenter: {
    flex: 1,
  },
  rowBengali: {
    fontSize: 16,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[700],
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 12,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
  },
  rowArabic: {
    fontSize: 20,
    fontFamily: fonts.arabic,
    color: colors.midnight[500],
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
  },
});
