import React from 'react';
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FadeInView } from '@/src/shared/components/FadeInView';
import { EMOTIONS } from '@/src/features/discovery/constants/emotion-verses';
import { useEmotionVerses, type DiscoveryAyah } from '@/src/features/discovery/hooks/useEmotionVerses';
import { colors, fonts } from '@/src/shared/lib/theme';

export default function DiscoveryScreen() {
  const { verses, loading, selectedEmotion, loadVerses, clear } = useEmotionVerses();

  // Verse list view
  if (selectedEmotion) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.verseHeader, { paddingTop: 60 }]}>
          <Pressable onPress={clear} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.midnight[600]} />
          </Pressable>
          <View style={styles.verseHeaderText}>
            <Ionicons
              name={selectedEmotion.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={selectedEmotion.color}
            />
            <Text style={styles.verseHeaderTitle}>{selectedEmotion.labelBn}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>আয়াত খোঁজা হচ্ছে...</Text>
          </View>
        ) : (
          <FlatList
            data={verses}
            keyExtractor={(item) => item.verseKey}
            contentContainerStyle={styles.verseList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <FadeInView delay={index * 100} slideUp>
                <VerseCard ayah={item} color={selectedEmotion.color} index={index} />
              </FadeInView>
            )}
          />
        )}
      </View>
    );
  }

  // Emotion grid view
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>আজ আপনার মন কেমন?</Text>
          <Text style={styles.headerSub}>অনুভূতি বেছে নিন, প্রাসঙ্গিক আয়াত দেখুন</Text>
        </View>

        <View style={styles.grid}>
          {EMOTIONS.map((emotion, index) => (
            <FadeInView key={emotion.id} delay={300 + index * 80} slideUp>
              <Pressable
                onPress={() => loadVerses(emotion)}
                style={({ pressed }) => [
                  styles.emotionCard,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: emotion.color + '18' }]}>
                  <Ionicons
                    name={emotion.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={emotion.color}
                  />
                </View>
                <View style={styles.emotionTextCol}>
                  <Text style={styles.emotionLabelBn}>{emotion.labelBn}</Text>
                  <Text style={styles.emotionLabelEn}>{emotion.labelEn}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.midnight[200]} />
              </Pressable>
            </FadeInView>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function VerseCard({ ayah, color, index }: { ayah: DiscoveryAyah; color: string; index: number }) {
  return (
    <View style={styles.verseCard}>
      {/* Top row: verse number + reference */}
      <View style={styles.verseTopRow}>
        <View style={[styles.verseBadge, { backgroundColor: color + '18' }]}>
          <Text style={[styles.verseBadgeText, { color }]}>{index + 1}</Text>
        </View>
        <Text style={styles.verseRef}>
          {ayah.surahName} ({ayah.verseKey})
        </Text>
      </View>

      {/* Arabic */}
      <Text style={styles.arabicText}>{ayah.textArabic}</Text>

      {/* Divider */}
      <View style={styles.verseDivider} />

      {/* Bengali translation */}
      <Text style={styles.bengaliText}>{ayah.textBengali}</Text>

      {/* Context — why this verse */}
      <View style={[styles.contextBar, { backgroundColor: color + '10', borderLeftColor: color }]}>
        <Text style={styles.contextText}>{ayah.contextBn}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.nur[50],
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    paddingTop: 60,
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
  heading: {
    fontSize: 24,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  grid: {
    gap: 10,
  },
  emotionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionTextCol: {
    flex: 1,
  },
  emotionLabelBn: {
    fontSize: 15,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  emotionLabelEn: {
    fontSize: 11,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
    marginTop: 2,
  },

  // Verse list
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.nur[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseHeaderText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verseHeaderTitle: {
    fontSize: 18,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[700],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  verseList: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  verseCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
  },
  verseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  verseBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseBadgeText: {
    fontSize: 13,
    fontFamily: fonts.bengaliBold,
  },
  verseRef: {
    fontSize: 12,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
  },
  contextBar: {
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  contextText: {
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.midnight[500],
    lineHeight: 22,
  },
  arabicText: {
    fontSize: 26,
    fontFamily: fonts.arabic,
    color: colors.midnight[800],
    textAlign: 'right',
    lineHeight: 48,
  },
  verseDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.nur[200],
    marginVertical: 14,
  },
  bengaliText: {
    fontSize: 15,
    fontFamily: fonts.bengali,
    color: colors.midnight[600],
    lineHeight: 26,
  },
});
