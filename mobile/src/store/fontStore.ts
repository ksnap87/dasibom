import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SIZE_KEY = '@dasibom_large_text';

export type FontSizeLevel = 'small' | 'medium' | 'large';

// 기본(small) 대비 배율
const SCALE_MAP: Record<FontSizeLevel, number> = {
  small: 1,
  medium: 1.2,
  large: 1.4,
};

interface FontState {
  level: FontSizeLevel;
  scale: number;
  loaded: boolean;
  loadFontSize: () => Promise<void>;
  setFontSize: (level: FontSizeLevel) => Promise<void>;
  /** 기본 fontSize에 배율을 적용하여 반환 */
  fs: (base: number) => number;
}

export const useFontStore = create<FontState>((set, get) => ({
  level: 'small',
  scale: 1,
  loaded: false,

  loadFontSize: async () => {
    try {
      const raw = await AsyncStorage.getItem(FONT_SIZE_KEY);
      if (raw === 'small' || raw === 'medium' || raw === 'large') {
        set({ level: raw, scale: SCALE_MAP[raw], loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setFontSize: async (level: FontSizeLevel) => {
    set({ level, scale: SCALE_MAP[level] });
    await AsyncStorage.setItem(FONT_SIZE_KEY, level);
  },

  fs: (base: number) => Math.round(base * get().scale),
}));
