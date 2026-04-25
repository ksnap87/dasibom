import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import AppText from '../components/AppText';
import { colors, typography } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

// 떨어지는 꽃잎
function FallingPetal({ delay, startX, duration }: { delay: number; startX: number; duration: number }) {
  const translateY = useRef(new Animated.Value(-40)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_H + 40,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.7, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: duration - 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, { toValue: 20, duration: 800, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: -20, duration: 800, useNativeDriver: true }),
          ]),
        ),
        Animated.loop(
          Animated.timing(rotate, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, duration, translateY, translateX, rotate, opacity]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.Text
      style={[
        styles.petal,
        {
          left: startX,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate: spin }],
        },
      ]}
    >
      {'✿'}
    </Animated.Text>
  );
}

export default function SplashScreen({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, subtitleFade, onFinish]);

  const petals = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 200 + Math.random() * 300,
    startX: Math.random() * SCREEN_W,
    duration: 2500 + Math.random() * 1000,
  }));

  return (
    <View style={styles.container}>
      {petals.map(p => (
        <FallingPetal key={p.id} delay={p.delay} startX={p.startX} duration={p.duration} />
      ))}

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.flowerContainer}>
          <View style={styles.flowerBg}>
            <AppText style={styles.flowerIcon}>{'✿'}</AppText>
          </View>
        </View>
        <AppText style={styles.title}>다시봄</AppText>
      </Animated.View>

      <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
        다시 찾는 봄날의 인연
      </Animated.Text>

      <View style={styles.bottomDecor}>
        <AppText style={styles.decorDot}>{'·'}</AppText>
        <AppText style={styles.decorDot}>{'·'}</AppText>
        <AppText style={styles.decorDot}>{'·'}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { alignItems: 'center' },
  flowerContainer: { marginBottom: 20 },
  flowerBg: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  flowerIcon: {
    fontSize: 52,
    color: colors.primary,
  },
  title: {
    fontSize: 40,
    fontWeight: typography.bold,
    color: colors.primaryDark,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.muted,
    fontWeight: typography.medium,
    marginTop: 12,
    letterSpacing: 1,
  },
  petal: {
    position: 'absolute',
    top: 0,
    fontSize: 18,
    color: '#E4A89A', // 연한 테라코타 꽃잎 — 크림 배경 위에서 은은히 보이도록
  },
  bottomDecor: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 8,
  },
  decorDot: {
    fontSize: 20,
    color: colors.border,
  },
});
