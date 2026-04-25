import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import AppText from '../../components/AppText';
import { colors, typography } from '../tokens';

interface Props {
  value: number | string;
  style?: ViewStyle;
  max?: number;
}

export default function Badge({ value, style, max = 99 }: Props) {
  let display = value;
  if (typeof value === 'number') {
    display = value > max ? `${max}+` : String(value);
  }
  return (
    <View style={[styles.base, style]}>
      <AppText style={styles.text}>{display}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.caption,
    fontWeight: typography.bold,
  },
});
