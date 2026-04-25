import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import AppText from '../../components/AppText';
import { colors, radius, spacing, typography } from '../tokens';

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger';

interface Props {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Tag({ label, tone = 'neutral', style, textStyle }: Props) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.base, t.container, style]}>
      <AppText style={[styles.label, t.text, textStyle]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
});

const toneStyles = {
  neutral: StyleSheet.create({
    container: { backgroundColor: colors.surfaceAlt },
    text: { color: colors.sub },
  }),
  accent: StyleSheet.create({
    container: { backgroundColor: colors.primaryLight },
    text: { color: colors.primaryDark },
  }),
  success: StyleSheet.create({
    container: { backgroundColor: '#E5EFE3' },
    text: { color: '#3F6B3B' },
  }),
  warn: StyleSheet.create({
    container: { backgroundColor: '#F6ECDA' },
    text: { color: '#8A6322' },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: '#F6DFDD' },
    text: { color: '#8A2F27' },
  }),
};
