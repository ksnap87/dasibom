import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

const API_BASE = Config.API_URL;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request deduplication for GET requests ───────────────
const pendingRequests = new Map<string, Promise<any>>();

function deduplicatedGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const key = url + (config?.params ? JSON.stringify(config.params) : '');
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }
  const promise = api.get<T>(url, config).finally(() => {
    pendingRequests.delete(key);
  });
  pendingRequests.set(key, promise);
  return promise;
}

// ── Retry with exponential backoff (GET only) ────────────
const RETRY_DELAYS = [1000, 2000];

function isRetryable(error: AxiosError): boolean {
  if (!error.response) return true; // network error
  return error.response.status >= 500;
}

async function retryRequest<T = any>(
  fn: () => Promise<T>,
  retriesLeft = 2,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const axiosErr = error as AxiosError;
    if (retriesLeft > 0 && isRetryable(axiosErr)) {
      const delay = RETRY_DELAYS[RETRY_DELAYS.length - retriesLeft] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retriesLeft - 1);
    }
    throw error;
  }
}

function getWithRetry<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return retryRequest(() => deduplicatedGet<T>(url, config));
}

// ── Error messages by status code ────────────────────────
const ERROR_MESSAGES: Record<number, string> = {
  401: '로그인이 필요합니다',
  403: '접근 권한이 없습니다',
  404: '요청한 정보를 찾을 수 없습니다',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // 토큰 갱신 로직 (401)
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

    // 상태 코드별 에러 메시지 추가
    const status = err.response?.status;
    if (status && ERROR_MESSAGES[status]) {
      err.message = ERROR_MESSAGES[status];
    } else if (!err.response) {
      err.message = '인터넷 연결을 확인해주세요';
    }

    return Promise.reject(err);
  },
);

// ── Profiles ──────────────────────────────────────────────
export const getMyProfile = () => getWithRetry('/api/profiles/me').then(r => r.data);
export const updateMyProfile = (data: object) => api.put('/api/profiles/me', data).then(r => r.data);
export const getProfile = (id: string) => getWithRetry(`/api/profiles/${id}`).then(r => r.data);
export const expressInterest = (to_user_id: string, is_liked: boolean) =>
  api.post('/api/profiles/interest', { to_user_id, is_liked }).then(r => r.data);

// ── Photos ────────────────────────────────────────────────
export const getMyPhotos = () => getWithRetry('/api/photos').then(r => r.data);

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
        // Content-Type 수동 설정 금지: fetch가 FormData의 boundary를 자동 포함
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
    let errMsg = '업로드 실패';
    try {
      const err = await response.json();
      errMsg = err.error ?? errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  try {
    return await response.json();
  } catch (_) {
    throw new Error('서버 응답을 처리할 수 없습니다.');
  }
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
export const dailyCheckin = () =>
  api.post('/api/profiles/checkin').then(r => r.data);
export const verifyPhone = (phone_number: string) =>
  api.post('/api/profiles/verify-phone', { phone_number }).then(r => r.data);

// ── Sent Interests ───────────────────────────────────────
export const getSentInterests = () => getWithRetry('/api/profiles/sent-interests').then(r => r.data);

// ── Matches ───────────────────────────────────────────────
export const getSuggestions = () => getWithRetry('/api/matches/suggestions').then(r => r.data);
export const getMutualMatches = () => getWithRetry('/api/matches').then(r => r.data);

// ── Messages ──────────────────────────────────────────────
export const getMessages = (matchId: string) => getWithRetry(`/api/messages/${matchId}`).then(r => r.data);
export const sendMessage = (match_id: string, content: string) =>
  api.post('/api/messages', { match_id, content }).then(r => r.data);
export const markRead = (matchId: string) => api.patch(`/api/messages/read/${matchId}`);

export default api;
