// src/shared/components/MixedText.tsx
// Renders text containing both Bengali and Arabic segments.
// Detects Arabic character ranges and applies the Arabic font automatically.

import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { fonts } from '@/src/shared/lib/theme';

// Arabic Unicode ranges: basic Arabic + supplements + presentation forms
const ARABIC_REGEX = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g;

interface MixedTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  arabicStyle?: StyleProp<TextStyle>;
}

export function MixedText({ children, style, arabicStyle }: MixedTextProps) {
  if (!children) return null;

  const parts = children.split(ARABIC_REGEX);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (ARABIC_REGEX.test(part)) {
          // Reset lastIndex since we reuse the regex
          ARABIC_REGEX.lastIndex = 0;
          return (
            <Text
              key={index}
              style={[{ fontFamily: fonts.arabic, fontSize: 20, lineHeight: 40 }, arabicStyle]}
            >
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}
