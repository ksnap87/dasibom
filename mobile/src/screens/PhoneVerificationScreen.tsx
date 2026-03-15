/**
 * PhoneVerificationScreen
 * 채팅 시작 전 본인인증 화면.
 * Firebase Phone Auth를 사용하여 실제 SMS 인증번호 발송.
 * 인증 완료 후 원래 가려던 ChatRoom으로 이동.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PhoneVerification'>;

const C = {
  primary: '#E8556D',
  primaryLight: '#FCEEF1',
  bg: '#FFF8F5',
  card: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#777777',
  border: '#E0D5D0',
  green: '#27AE60',
};

export default function PhoneVerificationScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { match_id, other_name, other_user_id } = route.params;

  const { setPhoneVerified } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const otpRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 쿨다운 타이머 시작 (재발송 방지)
  const startCooldown = () => {
    setCooldown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  // 전화번호를 국제 형식으로 변환 (010-1234-5678 → +821012345678)
  const toE164 = (phoneNumber: string): string => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      return `+82${digits.slice(1)}`;
    }
    return `+82${digits}`;
  };

  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert('알림', '올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const e164Phone = toE164(phone);
      const confirm = await auth().signInWithPhoneNumber(e164Phone);
      setConfirmation(confirm);
      setStep('otp');
      startCooldown();
      setTimeout(() => otpRef.current?.focus(), 200);
      Alert.alert('인증번호 발송', `${phone}으로 인증번호를 발송했습니다.\n잠시 후 문자를 확인해주세요.`);
    } catch (error: any) {
      console.error('SMS 발송 실패:', error);
      if (error.code === 'auth/too-many-requests') {
        Alert.alert('알림', '너무 많은 요청이 있었습니다.\n잠시 후 다시 시도해주세요.');
      } else if (error.code === 'auth/invalid-phone-number') {
        Alert.alert('알림', '올바른 휴대폰 번호를 입력해주세요.');
      } else {
        Alert.alert('오류', '인증번호 발송에 실패했습니다.\n다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setOtp('');
    setStep('phone');
    // 사용자가 다시 발송 버튼 누르도록
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      Alert.alert('알림', '6자리 인증번호를 입력해주세요.');
      return;
    }
    if (!confirmation) {
      Alert.alert('오류', '인증번호를 먼저 발송해주세요.');
      return;
    }

    setLoading(true);
    try {
      await confirmation.confirm(otp);
      // Firebase 인증 성공 → 앱 인증 상태 업데이트
      await setPhoneVerified(true);

      // Firebase 전화 인증 계정은 로그아웃 (Supabase 인증과 별개)
      try { await auth().signOut(); } catch {}

      setLoading(false);
      // 인증 완료 → 채팅방으로 이동 (뒤로가기 스택에서 이 화면 제거)
      nav.replace('ChatRoom', { match_id, other_name, other_user_id });
    } catch (error: any) {
      setLoading(false);
      console.error('인증 실패:', error);
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert('오류', '인증번호가 일치하지 않습니다.\n다시 확인해주세요.');
      } else if (error.code === 'auth/session-expired') {
        Alert.alert('오류', '인증번호가 만료되었습니다.\n다시 발송해주세요.');
        setStep('phone');
        setOtp('');
        setConfirmation(null);
      } else {
        Alert.alert('오류', '인증에 실패했습니다.\n다시 시도해주세요.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          {/* 헤더 */}
          <View style={styles.headerArea}>
            <Text style={styles.headerEmoji}>📱</Text>
            <Text style={styles.headerTitle}>본인인증</Text>
            <Text style={styles.headerSub}>
              {other_name}님과 채팅을 시작하려면{'\n'}휴대폰 본인인증이 필요합니다
            </Text>
          </View>

          {/* 인증 이유 설명 */}
          <View style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>왜 인증이 필요한가요?</Text>
            <Text style={styles.reasonText}>
              다시봄은 50대 이상을 위한 진지한 만남을 제공합니다.{'\n'}
              본인인증을 통해 신뢰할 수 있는 만남을 보장합니다. 인증 정보는 매칭에 활용되지 않습니다.
            </Text>
          </View>

          {/* 전화번호 입력 */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>휴대폰 번호</Text>
            <View style={styles.phoneRow}>
              <TextInput
                style={[styles.phoneInput, step === 'otp' && styles.inputDone]}
                value={phone}
                onChangeText={t => setPhone(formatPhone(t))}
                placeholder="010-0000-0000"
                keyboardType="phone-pad"
                editable={step === 'phone'}
                placeholderTextColor={C.sub}
              />
              {step === 'phone' && (
                <TouchableOpacity
                  style={[styles.sendBtn, loading && styles.btnDisabled]}
                  onPress={handleSendOTP}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.sendBtnText}>발송</Text>
                  }
                </TouchableOpacity>
              )}
              {step === 'otp' && (
                <TouchableOpacity
                  style={[styles.resendBtn, cooldown > 0 && styles.btnDisabled]}
                  onPress={handleResend}
                  disabled={cooldown > 0}
                >
                  <Text style={styles.resendText}>
                    {cooldown > 0 ? `재발송 (${cooldown}s)` : '재발송'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* OTP 입력 (2단계) */}
            {step === 'otp' && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>인증번호 (6자리)</Text>
                <TextInput
                  ref={otpRef}
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="인증번호 입력"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={C.sub}
                />
                <Text style={styles.otpHint}>📩 {phone}으로 발송된 6자리 번호를 입력하세요</Text>
              </>
            )}
          </View>

          {/* 확인 버튼 */}
          {step === 'otp' && (
            <TouchableOpacity
              style={[styles.verifyBtn, loading && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.verifyBtnText}>인증 완료</Text>
              }
            </TouchableOpacity>
          )}

          {/* 건너뛰기 (나중에 인증) */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => nav.goBack()}
          >
            <Text style={styles.skipText}>나중에 인증하기</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, padding: 24 },

  headerArea: { alignItems: 'center', marginBottom: 24 },
  headerEmoji: { fontSize: 52, marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 8 },
  headerSub: { fontSize: 15, color: C.sub, textAlign: 'center', lineHeight: 22 },

  reasonCard: {
    backgroundColor: '#FFF9E6', borderRadius: 12, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#F9E09A',
  },
  reasonTitle: { fontSize: 14, fontWeight: '700', color: '#7D5A00', marginBottom: 6 },
  reasonText: { fontSize: 13, color: '#9E7500', lineHeight: 20 },

  card: { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
  inputLabel: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 8 },

  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  phoneInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, color: C.text,
    backgroundColor: '#FFFAF8',
  },
  inputDone: { borderColor: C.green, backgroundColor: '#F0FBF4' },
  sendBtn: {
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  sendBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  resendBtn: {
    paddingHorizontal: 14, paddingVertical: 14,
  },
  resendText: { color: C.sub, fontSize: 14, textDecorationLine: 'underline' },

  otpInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 24,
    color: C.text, letterSpacing: 8, backgroundColor: '#FFFAF8',
    textAlign: 'center',
  },
  otpHint: { fontSize: 12, color: C.sub, marginTop: 8 },

  verifyBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginBottom: 12,
  },
  verifyBtnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 15, color: C.sub, textDecorationLine: 'underline' },

  btnDisabled: { opacity: 0.6 },
});
