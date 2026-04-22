import React, { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, Linking,
} from 'react-native';
import AppText from '../components/AppText';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, supabase } from '../store/authStore';
import Config from '../config';
import { getErrorMessage } from '../utils/error';
import { LEGAL_URLS } from '../constants';

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
      Alert.alert('로그인 실패', getErrorMessage(err, '다시 시도해주세요.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <AppText style={styles.logoEmoji}>🌸</AppText>
          <AppText style={styles.logoText}>다시봄</AppText>
          <AppText style={styles.tagline}>당신의 봄날을 다시</AppText>
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
              <AppText style={styles.kakaoIcon}>💬</AppText>
              <AppText style={styles.kakaoLabel}>카카오로 시작하기</AppText>
            </>
          )}
        </TouchableOpacity>

        {/* 약관·개인정보 동의 고지 — 회원가입 버튼 누르면 동의한 것으로 간주 */}
        <View style={styles.consentBox}>
          <AppText style={styles.consentText}>
            시작하시면 아래 내용에 동의한 것으로 간주합니다.
          </AppText>
          <View style={styles.consentLinks}>
            <TouchableOpacity
              onPress={() => Linking.openURL(LEGAL_URLS.termsOfService)}
              accessibilityRole="link"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText style={styles.consentLink}>이용약관</AppText>
            </TouchableOpacity>
            <AppText style={styles.consentDot}> · </AppText>
            <TouchableOpacity
              onPress={() => Linking.openURL(LEGAL_URLS.privacyPolicy)}
              accessibilityRole="link"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText style={styles.consentLink}>개인정보처리방침</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <AppText style={styles.footer}>
          다시, 설레는 만남이 시작되는 곳
        </AppText>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devSkip}
            onPress={async () => {
              try {
                setLoading(true);
                // 서버에서 실제 Supabase 세션 발급
                const res = await axios.post(`${Config.API_URL}/api/auth/dev-login`);
                const { access_token, refresh_token, user } = res.data;

                await AsyncStorage.setItem('access_token', access_token);
                await supabase.auth.setSession({ access_token, refresh_token });

                useAuthStore.setState({
                  isAuthenticated: true,
                  user,
                });
              } catch (err: any) {
                Alert.alert('DEV 로그인 실패', getErrorMessage(err, '서버에 연결할 수 없습니다.'));
              } finally {
                setLoading(false);
              }
            }}
          >
            <AppText style={styles.devSkipText}>[DEV] 테스트 로그인</AppText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 28, paddingBottom: 20 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoEmoji: { fontSize: 64, marginBottom: 10 },
  logoText: { fontSize: 44, fontWeight: '700', color: C.primary, letterSpacing: 2 },
  tagline: { fontSize: 16, color: C.sub, marginTop: 8 },
  kakaoBtn: {
    backgroundColor: C.kakaoYellow,
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  kakaoBtnDisabled: { opacity: 0.6 },
  kakaoIcon: { fontSize: 22, marginRight: 10 },
  kakaoLabel: { color: C.kakaoText, fontSize: 18, fontWeight: '600' },
  footer: { textAlign: 'center', color: C.sub, fontSize: 14, lineHeight: 22 },
  consentBox: { alignItems: 'center', marginBottom: 20 },
  consentText: { fontSize: 13, color: C.sub, lineHeight: 20 },
  consentLinks: { flexDirection: 'row', marginTop: 4 },
  consentLink: { fontSize: 13, color: C.primary, textDecorationLine: 'underline', fontWeight: '600' },
  consentDot: { fontSize: 13, color: C.sub },
  devSkip: { marginTop: 16, padding: 12, alignItems: 'center' },
  devSkipText: { color: '#999', fontSize: 13 },
});
