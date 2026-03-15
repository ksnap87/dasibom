import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

const API_BASE = Config.API_URL;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // 토큰 만료 시 Supabase로 재발급 시도
        const { supabase } = await import('../store/authStore');
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session?.access_token) {
          const newToken = data.session.access_token;
          await AsyncStorage.setItem('access_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (_) {}
      // 재발급 실패 시 토큰 제거
      await AsyncStorage.removeItem('access_token');
    }
    return Promise.reject(err);
  },
);

// ── Profiles ──────────────────────────────────────────────
export const getMyProfile = () => api.get('/api/profiles/me').then(r => r.data);
export const updateMyProfile = (data: object) => api.put('/api/profiles/me', data).then(r => r.data);
export const getProfile = (id: string) => api.get(`/api/profiles/${id}`).then(r => r.data);
export const expressInterest = (to_user_id: string, is_liked: boolean) =>
  api.post('/api/profiles/interest', { to_user_id, is_liked }).then(r => r.data);

// ── Photos ────────────────────────────────────────────────
export const getMyPhotos = () => api.get('/api/photos').then(r => r.data);

export const uploadPhoto = async (uri: string): Promise<any> => {
  const doUpload = async () => {
    const token = await AsyncStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('photo', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const response = await fetch(`${API_BASE}/api/photos/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    return response;
  };

  let response = await doUpload();

  // 토큰 만료 시 갱신 후 재시도
  if (response.status === 401) {
    try {
      const { supabase } = await import('../store/authStore');
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        await AsyncStorage.setItem('access_token', data.session.access_token);
        response = await doUpload();
      }
    } catch (_) {}
  }

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? '업로드 실패');
  }
  return response.json();
};

export const deletePhoto = (photoId: string) =>
  api.delete(`/api/photos/${photoId}`).then(r => r.data);

export const setProfilePhoto = (photo_url: string) =>
  api.patch('/api/photos/set-profile', { photo_url }).then(r => r.data);

export const setBackgroundPhoto = (background_url: string | null) =>
  api.patch('/api/photos/set-background', { background_url }).then(r => r.data);

// ── Credits ───────────────────────────────────────────────
export const deductCredits = (amount = 1) =>
  api.post('/api/profiles/credits/deduct', { amount }).then(r => r.data);

// ── Report / Block / Delete ───────────────────────────────
export const reportUser = (reported_id: string, reason: string, detail?: string) =>
  api.post('/api/profiles/report', { reported_id, reason, detail }).then(r => r.data);
export const blockUser = (blocked_id: string) =>
  api.post('/api/profiles/block', { blocked_id }).then(r => r.data);
export const unblockUser = (blocked_id: string) =>
  api.delete(`/api/profiles/block/${blocked_id}`).then(r => r.data);
export const deleteMyAccount = () =>
  api.delete('/api/profiles/me').then(r => r.data);

// ── Contacts ──────────────────────────────────────────────
export const syncContactHashes = (hashes: string[]) =>
  api.post('/api/profiles/sync-contacts', { hashes }).then(r => r.data);
export const savePhoneHash = (phone_hash: string) =>
  api.post('/api/profiles/phone-hash', { phone_hash }).then(r => r.data);

// ── Matches ───────────────────────────────────────────────
export const getSuggestions = () => api.get('/api/matches/suggestions').then(r => r.data);
export const getMutualMatches = () => api.get('/api/matches').then(r => r.data);

// ── Messages ──────────────────────────────────────────────
export const getMessages = (matchId: string) => api.get(`/api/messages/${matchId}`).then(r => r.data);
export const sendMessage = (match_id: string, content: string) =>
  api.post('/api/messages', { match_id, content }).then(r => r.data);
export const markRead = (matchId: string) => api.patch(`/api/messages/read/${matchId}`);

export default api;
