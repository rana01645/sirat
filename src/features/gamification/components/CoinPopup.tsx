// src/features/gamification/components/CoinPopup.tsx
// Animated "+N ইলম কয়েন" popup that slides up and fades out.
// Triggered when user earns coins from any action.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '@/src/shared/lib/theme';

export interface CoinPopupRef {
  show: (amount: number, reason: string) => void;
}

interface PopupItem {
  id: number;
  amount: number;
  reason: string;
}

let nextId = 0;

export function CoinPopup({ popupRef }: { popupRef: React.MutableRefObject<CoinPopupRef | null> }) {
  const [items, setItems] = useState<PopupItem[]>([]);

  const show = useCallback((amount: number, reason: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, amount, reason }]);
    // Auto-remove after animation
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 2000);
  }, []);

  useEffect(() => {
    popupRef.current = { show };
  }, [popupRef, show]);

  return (
    <>
      {items.map((item, index) => (
        <CoinPopupItem
          key={item.id}
          amount={item.amount}
          reason={item.reason}
          offset={index * 45}
        />
      ))}
    </>
  );
}

function CoinPopupItem({
  amount,
  reason,
  offset,
}: {
  amount: number;
  reason: string;
  offset: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      // Appear
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(800),
      // Float up and fade
      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [translateY, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.popup,
        {
          bottom: 120 + offset,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.popupText}>
        <MaterialCommunityIcons name="star-circle-outline" size={16} color={colors.nur[600]} /> +{amount} {reason}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(42, 58, 42, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 999,
  },
  popupText: {
    fontSize: 15,
    fontFamily: fonts.bengaliBold,
    color: colors.nur[200],
  },
});
