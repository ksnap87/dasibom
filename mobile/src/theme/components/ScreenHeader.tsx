import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../components/AppText';
import { colors, spacing, typography } from '../tokens';

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <AppText style={styles.title}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  left: { flex: 1 },
  right: { marginLeft: spacing.sm },
  title: {
    fontSize: typography.heading,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.caption,
    color: colors.sub,
    marginTop: 4,
  },
});
