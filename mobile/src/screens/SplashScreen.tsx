import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

// 떨어지는 꽃잎 컴포넌트
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
        // 좌우 흔들림
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, { toValue: 20, duration: 800, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: -20, duration: 800, useNativeDriver: true }),
          ]),
        ),
        // 회전
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
      {'*'}
    </Animated.Text>
  );
}

export default function SplashScreen({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 메인 로고 애니메이션
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 서브타이틀 페이드인
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, subtitleFade, onFinish]);

  // 꽃잎 위치/타이밍 랜덤 생성
  const petals = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 200 + Math.random() * 300,
    startX: Math.random() * SCREEN_W,
    duration: 2500 + Math.random() * 1000,
  }));

  return (
    <View style={styles.container}>
      {/* 떨어지는 꽃잎들 */}
      {petals.map(p => (
        <FallingPetal key={p.id} delay={p.delay} startX={p.startX} duration={p.duration} />
      ))}

      {/* 메인 로고 */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* 벚꽃 아이콘 (SVG 대신 텍스트 기반) */}
        <View style={styles.flowerContainer}>
          <View style={styles.flowerBg}>
            <Text style={styles.flowerIcon}>{'✿'}</Text>
          </View>
        </View>
        <Text style={styles.title}>다시봄</Text>
      </Animated.View>

      <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
        다시 찾는 봄날의 인연
      </Animated.Text>

      {/* 하단 장식 */}
      <View style={styles.bottomDecor}>
        <Text style={styles.decorDot}>{'·'}</Text>
        <Text style={styles.decorDot}>{'·'}</Text>
        <Text style={styles.decorDot}>{'·'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  flowerContainer: {
    marginBottom: 20,
  },
  flowerBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FCEEF1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E8556D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  flowerIcon: {
    fontSize: 52,
    color: '#E8556D',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#E8556D',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#C0A0A0',
    fontWeight: '500',
    marginTop: 12,
    letterSpacing: 1,
  },
  petal: {
    position: 'absolute',
    top: 0,
    fontSize: 18,
    color: '#F8B0C0',
  },
  bottomDecor: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 8,
  },
  decorDot: {
    fontSize: 20,
    color: '#E0C8C8',
  },
});
