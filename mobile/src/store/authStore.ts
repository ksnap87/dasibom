import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { login as kakaoSdkLogin, logout as kakaoSdkLogout } from '@react-native-seoul/kakao-login';
import axios from 'axios';
import { Profile } from '../types';
import Config from '../config';

const SUPABASE_URL = Config.SUPABASE_URL;
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY;

const CREDITS_KEY = 'dasibom_credits';
const PHONE_VERIFIED_KEY = 'dasibom_phone_verified';
const DEFAULT_CREDITS = 3;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface AuthState {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  credits: number;
  phoneVerified: boolean;

  setProfile: (p: Profile | null) => void;
  kakaoLogin: () => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;

  // 크레딧
  loadCredits: () => Promise<void>;
  deductCredit: (amount?: number) => Promise<boolean>;  // false = 크레딧 부족

  // 본인인증
  loadPhoneVerified: () => Promise<void>;
  setPhoneVerified: (verified: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  credits: DEFAULT_CREDITS,
  phoneVerified: false,

  setProfile: (profile) => set({ profile }),

  kakaoLogin: async () => {
    // 1. 카카오 네이티브 SDK 로그인
    const kakaoResult = await kakaoSdkLogin();

    // 2. 백엔드로 카카오 토큰 전송 → Supabase 세션 교환
    const response = await axios.post(`${Config.API_URL}/api/auth/kakao`, {
      kakaoAccessToken: kakaoResult.accessToken,
    });

    const { access_token, refresh_token, user } = response.data;

    // 3. 토큰 저장
    await AsyncStorage.setItem('access_token', access_token);

    // 4. Supabase 클라이언트에 세션 설정 (토큰 자동 갱신 유지)
    await supabase.auth.setSession({ access_token, refresh_token });

    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    try { await kakaoSdkLogout(); } catch (_) { /* 카카오 로그아웃 실패 무시 */ }
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('access_token');
    set({ user: null, profile: null, isAuthenticated: false, credits: DEFAULT_CREDITS, phoneVerified: false });
  },

  loadSession: async () => {
    set({ isLoading: true });
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await AsyncStorage.setItem('access_token', data.session.access_token);
      set({ user: data.session.user, isAuthenticated: true });
    }
    set({ isLoading: false });

    // 토큰 자동 갱신 시 AsyncStorage도 업데이트
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await AsyncStorage.setItem('access_token', session.access_token);
      }
    });
  },

  // ── 크레딧 ───────────────────────────────────────────────
  loadCredits: async () => {
    try {
      const { getMyProfile } = await import('../api/client');
      const profile = await getMyProfile();
      set({ credits: profile.credits ?? DEFAULT_CREDITS });
    } catch {
      // 서버 실패 시 로컬 폴백
      const raw = await AsyncStorage.getItem(CREDITS_KEY);
      set({ credits: raw !== null ? parseInt(raw, 10) : DEFAULT_CREDITS });
    }
  },

  deductCredit: async (amount = 1) => {
    try {
      const { deductCredits } = await import('../api/client');
      const result = await deductCredits(amount);
      set({ credits: result.credits });
      return true;
    } catch {
      return false;
    }
  },

  // ── 본인인증 ─────────────────────────────────────────────
  loadPhoneVerified: async () => {
    const raw = await AsyncStorage.getItem(PHONE_VERIFIED_KEY);
    set({ phoneVerified: raw === 'true' });
  },

  setPhoneVerified: async (verified: boolean) => {
    await AsyncStorage.setItem(PHONE_VERIFIED_KEY, String(verified));
    set({ phoneVerified: verified });
  },
}));
