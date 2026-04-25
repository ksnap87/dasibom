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
import { colors, radius, spacing, typography } from '../theme';

const KAKAO_YELLOW = '#FEE500';
const KAKAO_TEXT = '#191919';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const { kakaoLogin } = useAuthStore();

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      await kakaoLogin();
    } catch (err: any) {
      if (err?.message?.includes('cancel')) return;
      Alert.alert('로그인 실패', getErrorMessage(err, '다시 시도해주세요.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logoArea}>
          <AppText style={styles.logoEmoji}>🌸</AppText>
          <AppText style={styles.logoText}>다시봄</AppText>
          <AppText style={styles.tagline}>당신의 봄날을 다시</AppText>
        </View>

        <TouchableOpacity
          style={[styles.kakaoBtn, loading && styles.kakaoBtnDisabled]}
          onPress={handleKakaoLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={KAKAO_TEXT} />
          ) : (
            <>
              <AppText style={styles.kakaoIcon}>💬</AppText>
              <AppText style={styles.kakaoLabel}>카카오로 시작하기</AppText>
            </>
          )}
        </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg + 4,
    paddingBottom: spacing.lg,
  },
  logoArea: { alignItems: 'center', marginBottom: spacing.xl + 8 },
  logoEmoji: { fontSize: 64, marginBottom: spacing.xs + 2 },
  logoText: {
    fontSize: 44,
    fontWeight: typography.bold,
    color: colors.primaryDark,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: typography.body,
    color: colors.sub,
    marginTop: spacing.xs,
  },
  kakaoBtn: {
    backgroundColor: KAKAO_YELLOW,
    borderRadius: radius.md,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    minHeight: 52,
  },
  kakaoBtnDisabled: { opacity: 0.6 },
  kakaoIcon: { fontSize: 22, marginRight: spacing.xs + 2 },
  kakaoLabel: {
    color: KAKAO_TEXT,
    fontSize: typography.bodyLarge,
    fontWeight: typography.semibold,
  },
  footer: {
    textAlign: 'center',
    color: colors.sub,
    fontSize: typography.caption + 1,
    lineHeight: (typography.caption + 1) * typography.lineRelaxed,
  },
  consentBox: { alignItems: 'center', marginBottom: spacing.md + 4 },
  consentText: {
    fontSize: typography.caption,
    color: colors.sub,
    lineHeight: typography.caption * typography.lineRelaxed,
  },
  consentLinks: { flexDirection: 'row', marginTop: 4 },
  consentLink: {
    fontSize: typography.caption,
    color: colors.primaryDark,
    textDecorationLine: 'underline',
    fontWeight: typography.semibold,
  },
  consentDot: { fontSize: typography.caption, color: colors.sub },
  devSkip: { marginTop: spacing.md, padding: spacing.sm, alignItems: 'center' },
  devSkipText: { color: colors.muted, fontSize: typography.caption },
});
