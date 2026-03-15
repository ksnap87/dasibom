import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

const C = {
  primary: '#E8556D',
  bg: '#FFF8F5',
  sub: '#777777',
  kakaoYellow: '#FEE500',
  kakaoText: '#191919',
};

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const { kakaoLogin } = useAuthStore();

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      await kakaoLogin();
    } catch (err: any) {
      // 사용자가 카카오 로그인을 취소한 경우
      if (err?.message?.includes('cancel')) return;
      Alert.alert('로그인 실패', err.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>🌸</Text>
          <Text style={styles.logoText}>다시봄</Text>
          <Text style={styles.tagline}>당신의 봄날을 다시</Text>
        </View>

        {/* 카카오 로그인 버튼 */}
        <TouchableOpacity
          style={[styles.kakaoBtn, loading && styles.kakaoBtnDisabled]}
          onPress={handleKakaoLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={C.kakaoText} />
          ) : (
            <>
              <Text style={styles.kakaoIcon}>💬</Text>
              <Text style={styles.kakaoLabel}>카카오로 시작하기</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          다시, 설레는 만남이 시작되는 곳
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 60 },
  logoEmoji: { fontSize: 64, marginBottom: 8 },
  logoText: { fontSize: 40, fontWeight: '700', color: C.primary, letterSpacing: 2 },
  tagline: { fontSize: 15, color: C.sub, marginTop: 6 },
  kakaoBtn: {
    backgroundColor: C.kakaoYellow,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  kakaoBtnDisabled: { opacity: 0.6 },
  kakaoIcon: { fontSize: 20, marginRight: 8 },
  kakaoLabel: { color: C.kakaoText, fontSize: 17, fontWeight: '600' },
  footer: { textAlign: 'center', color: C.sub, fontSize: 13, lineHeight: 20 },
});
