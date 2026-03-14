import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

const C = {
  primary: '#E8556D',
  bg: '#FFF8F5',
  card: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#777777',
  border: '#E0D5D0',
};

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        Alert.alert('가입 완료', '이메일을 확인해 인증을 완료해주세요.\n(개발 중에는 Supabase에서 이메일 인증을 비활성화할 수 있습니다.)');
      }
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>🌸</Text>
          <Text style={styles.logoText}>다시봄</Text>
          <Text style={styles.tagline}>진지한 만남, 소중한 인연</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
            onPress={() => setTab('login')}
          >
            <Text style={[styles.tabLabel, tab === 'login' && styles.tabLabelActive]}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
            onPress={() => setTab('register')}
          >
            <Text style={[styles.tabLabel, tab === 'register' && styles.tabLabelActive]}>회원가입</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="이메일 주소 입력"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor={C.sub}
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호 입력 (6자 이상)"
            secureTextEntry
            placeholderTextColor={C.sub}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitLabel}>{tab === 'login' ? '로그인' : '회원가입'}</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          50대 이상의 진지한 만남을 위한 공간입니다.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoEmoji: { fontSize: 64, marginBottom: 8 },
  logoText: { fontSize: 40, fontWeight: '700', color: C.primary, letterSpacing: 2 },
  tagline: { fontSize: 15, color: C.sub, marginTop: 6 },
  tabRow: { flexDirection: 'row', backgroundColor: '#EEE8E5', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabLabel: { fontSize: 16, color: C.sub, fontWeight: '500' },
  tabLabelActive: { color: C.primary, fontWeight: '700' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 24, marginBottom: 20, elevation: 2 },
  label: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: C.text, marginBottom: 16, backgroundColor: '#FFFAF8',
  },
  submitBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitLabel: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  footer: { textAlign: 'center', color: C.sub, fontSize: 13, lineHeight: 20 },
});
