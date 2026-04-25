import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native';
import AppText from '../../components/AppText';
import { colors, radius, spacing, typography } from '../tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  fullWidth = true,
  style,
  accessibilityLabel,
}: Props) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.base,
        s.container,
        v.container,
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          <AppText style={[styles.label, s.label, v.text]}>{label}</AppText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontWeight: typography.semibold },
  disabled: { opacity: 0.45 },
});

const sizeStyles = {
  md: StyleSheet.create({
    container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44 },
    label: { fontSize: typography.body },
  }),
  lg: StyleSheet.create({
    container: { paddingVertical: 16, paddingHorizontal: spacing.lg, minHeight: 52 },
    label: { fontSize: typography.bodyLarge },
  }),
};

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.primary },
    text: { color: '#FFFFFF' },
  }),
  secondary: StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.text },
  }),
  ghost: StyleSheet.create({
    container: { backgroundColor: 'transparent' },
    text: { color: colors.sub },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: colors.danger },
    text: { color: '#FFFFFF' },
  }),
};
