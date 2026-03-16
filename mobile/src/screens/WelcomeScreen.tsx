import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Dimensions,
} from 'react-native';

const { height } = Dimensions.get('window');

const C = {
  primary: '#E8556D',
  bg: '#FFF8F5',
  sub: '#777777',
  white: '#FFFFFF',
};

interface Props {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* 상단 여백 */}
        <View style={styles.topSpace} />

        {/* 메인 콘텐츠 */}
        <View style={styles.content}>
          <Text style={styles.emoji}>🌸</Text>
          <Text style={styles.title}>다시봄에 오신 걸{'\n'}환영합니다!</Text>
          <Text style={styles.desc}>
            간단한 설문을 작성하시면{'\n'}
            가치관이 맞는 분을 추천해드려요
          </Text>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>💝</Text>
              <Text style={styles.featureText}>가치관 중심의 맞춤 추천</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text style={styles.featureText}>연락처 기반 지인 제외</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>✨</Text>
              <Text style={styles.featureText}>진정성 있는 50+ 만남</Text>
            </View>
          </View>
        </View>

        {/* 하단 버튼 — 충분한 여백 */}
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={onStart}
            activeOpacity={0.8}
          >
            <Text style={styles.startLabel}>설문 시작하기</Text>
          </TouchableOpacity>
          <Text style={styles.note}>약 3분 정도 소요됩니다</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, paddingHorizontal: 28 },
  topSpace: { height: height * 0.06 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 72, marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  desc: {
    fontSize: 16,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  features: { width: '100%', gap: 16 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: { fontSize: 24, marginRight: 14 },
  featureText: { fontSize: 16, fontWeight: '600', color: '#444' },
  bottomArea: {
    paddingBottom: 36,
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  startLabel: {
    color: C.white,
    fontSize: 18,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
    color: '#aaa',
  },
});
