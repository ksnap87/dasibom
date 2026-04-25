import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../tokens';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
}

export default function Card({ children, style, elevated = false, padded = true }: Props) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        elevated ? shadow.card : styles.bordered,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  padded: { padding: spacing.md },
  bordered: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
