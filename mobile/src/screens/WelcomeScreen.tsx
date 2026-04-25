import React from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import AppText from '../components/AppText';
import { Button, colors, radius, spacing, typography } from '../theme';

const { height } = Dimensions.get('window');

interface Props {
  onStart: () => void;
}

const FEATURES: { icon: string; text: string }[] = [
  { icon: '💝', text: '가치관 중심의 맞춤 추천' },
  { icon: '🔒', text: '연락처 기반 지인 제외' },
  { icon: '✨', text: '진정성 있는 50+ 만남' },
];

export default function WelcomeScreen({ onStart }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.topSpace} />

        <View style={styles.content}>
          <AppText style={styles.emoji}>🌸</AppText>
          <AppText style={styles.title}>
            다시봄에 오신 걸{'\n'}환영합니다
          </AppText>
          <AppText style={styles.desc}>
            간단한 설문을 작성하시면{'\n'}
            가치관이 맞는 분을 추천해드려요
          </AppText>

          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <AppText style={styles.featureIcon}>{f.icon}</AppText>
                <AppText style={styles.featureText}>{f.text}</AppText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomArea}>
          <Button label="설문 시작하기" onPress={onStart} />
          <AppText style={styles.note}>약 3분 정도 소요됩니다</AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: spacing.lg + 4 },
  topSpace: { height: height * 0.06 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 72, marginBottom: spacing.md },
  title: {
    fontSize: typography.heading,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: typography.heading * typography.lineTight,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  desc: {
    fontSize: typography.body,
    color: colors.sub,
    textAlign: 'center',
    lineHeight: typography.body * typography.lineRelaxed,
    marginBottom: spacing.xl,
  },
  features: { width: '100%', gap: spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 4,
  },
  featureIcon: { fontSize: 22, marginRight: spacing.sm + 2 },
  featureText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  bottomArea: {
    paddingBottom: spacing.xl + 4,
    alignItems: 'center',
    gap: spacing.sm,
  },
  note: {
    fontSize: typography.caption,
    color: colors.muted,
  },
});
