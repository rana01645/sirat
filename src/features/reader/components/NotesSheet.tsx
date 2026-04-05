// src/features/reader/components/NotesSheet.tsx
// Bottom sheet modal for personal reflections (Tadabbur).
// Opens from AyahCard — saves notes to SQLite journal_entries table.
// Uses pure-JS BottomSheetModal — no native modules needed.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, type BottomSheetModalRef } from '@/src/shared/components/BottomSheetModal';
import { useDatabaseContext } from '@/src/shared/providers/DatabaseProvider';
import { colors, fonts, spacing } from '@/src/shared/lib/theme';

interface NotesSheetProps {
  sheetRef: React.RefObject<BottomSheetModalRef | null>;
  ayahId: number;
  verseKey: string;
  onSaved?: () => void;
}

export function NotesSheet({ sheetRef, ayahId, verseKey, onSaved }: NotesSheetProps) {
  const { db } = useDatabaseContext();
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  // Load existing note when ayah changes
  useEffect(() => {
    if (ayahId <= 0) return;
    setSaved(false);
    (async () => {
      const row = await db.getFirstAsync<{ reflection_text: string }>(
        'SELECT reflection_text FROM journal_entries WHERE ayah_id = ? ORDER BY created_at DESC LIMIT 1',
        ayahId
      );
      setNote(row?.reflection_text ?? '');
    })();
  }, [ayahId, db]);

  const handleSave = useCallback(async () => {
    if (!note.trim() || ayahId <= 0) return;
    Keyboard.dismiss();

    await db.runAsync('DELETE FROM journal_entries WHERE ayah_id = ?', ayahId);
    await db.runAsync(
      'INSERT INTO journal_entries (ayah_id, reflection_text) VALUES (?, ?)',
      ayahId,
      note.trim()
    );

    setSaved(true);
    onSaved?.();
    setTimeout(() => {
      sheetRef.current?.close();
      setSaved(false);
    }, 800);
  }, [note, ayahId, db, sheetRef]);

  return (
    <BottomSheetModal ref={sheetRef} heightFraction={0.55}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}><Ionicons name="pencil-outline" size={16} color={colors.midnight[600]} /> ব্যক্তিগত নোট</Text>
          <Text style={styles.verseRef}>আয়াত {verseKey}</Text>
        </View>

        {/* Note input */}
        <TextInput
          style={styles.input}
          placeholder="এই আয়াত পড়ে আপনার মনে কী এলো..."
          placeholderTextColor={colors.midnight[300]}
          multiline
          textAlignVertical="top"
          value={note}
          onChangeText={(text) => {
            setNote(text);
            setSaved(false);
          }}
        />

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, saved && styles.saveBtnSaved]}
          disabled={saved}
        >
          <Text style={[styles.saveBtnText, saved && styles.saveBtnTextSaved]}>
            {saved ? '✓ সংরক্ষিত হয়েছে' : 'সংরক্ষণ করুন'}
          </Text>
        </Pressable>
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
    color: colors.midnight[700],
  },
  verseRef: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[300],
  },
  input: {
    flex: 1,
    marginTop: spacing.md,
    fontSize: 16,
    fontFamily: fonts.bengali,
    color: colors.midnight[700],
    lineHeight: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  saveBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.sakina[600],
    alignItems: 'center',
  },
  saveBtnSaved: {
    backgroundColor: colors.sakina[100],
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.white,
  },
  saveBtnTextSaved: {
    color: colors.sakina[700],
  },
});
