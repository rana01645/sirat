// src/shared/components/BottomSheetModal.tsx
// Pure JS bottom sheet using Modal + Animated — no native modules needed.
// Works in Expo Go. Slide-up animation with backdrop tap-to-dismiss.

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { colors } from '@/src/shared/lib/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface BottomSheetModalRef {
  open: () => void;
  close: () => void;
}

interface BottomSheetModalProps {
  children: React.ReactNode;
  /** Height as fraction of screen (0-1). Default 0.7 */
  heightFraction?: number;
  onClose?: () => void;
}

export const BottomSheetModal = forwardRef<BottomSheetModalRef, BottomSheetModalProps>(
  ({ children, heightFraction = 0.7, onClose }, ref) => {
    const [visible, setVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const sheetHeight = SCREEN_HEIGHT * heightFraction;

    const openSheet = useCallback(() => {
      setVisible(true);
    }, []);

    const closeSheet = useCallback(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: sheetHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        onClose?.();
      });
    }, [slideAnim, backdropAnim, sheetHeight, onClose]);

    useImperativeHandle(ref, () => ({ open: openSheet, close: closeSheet }), [openSheet, closeSheet]);

    // Animate in when visible changes
    useEffect(() => {
      if (visible) {
        slideAnim.setValue(sheetHeight);
        backdropAnim.setValue(0);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 20,
            stiffness: 150,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible, slideAnim, backdropAnim, sheetHeight]);

    // Swipe down to dismiss
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            slideAnim.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            closeSheet();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              damping: 20,
              stiffness: 150,
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    if (!visible) return null;

    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={closeSheet}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Backdrop */}
          <Animated.View
            style={[styles.backdrop, { opacity: Animated.multiply(backdropAnim, 0.35) }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              { height: sheetHeight, transform: [{ translateY: slideAnim }] },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Handle indicator */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

BottomSheetModal.displayName = 'BottomSheetModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: colors.nur[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.nur[300],
  },
});
