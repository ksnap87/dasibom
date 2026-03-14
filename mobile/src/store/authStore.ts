import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await AsyncStorage.setItem('access_token', data.session?.access_token ?? '');
    set({ user: data.user, isAuthenticated: true });
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (data.session) {
      await AsyncStorage.setItem('access_token', data.session.access_token);
    }
    set({ user: data.user, isAuthenticated: true });
  },

  signOut: async () => {
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
    const raw = await AsyncStorage.getItem(CREDITS_KEY);
    const credits = raw !== null ? parseInt(raw, 10) : DEFAULT_CREDITS;
    if (raw === null) await AsyncStorage.setItem(CREDITS_KEY, String(DEFAULT_CREDITS));
    set({ credits });
  },

  deductCredit: async (amount = 1) => {
    const { credits } = get();
    if (credits < amount) return false;
    const next = credits - amount;
    await AsyncStorage.setItem(CREDITS_KEY, String(next));
    set({ credits: next });
    return true;
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
