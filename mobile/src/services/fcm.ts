import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';

/**
 * FCM 푸시 알림 서비스
 * - 권한 요청
 * - 디바이스 토큰 발급 및 서버 저장
 * - 포그라운드/백그라운드 메시지 수신
 */

/** Android 13+ 알림 권한 요청 */
async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/** FCM 토큰 발급 → 서버 저장 */
export async function registerFCMToken(): Promise<string | null> {
  try {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      console.log('[FCM] 알림 권한 거부됨');
      return null;
    }

    const token = await messaging().getToken();
    console.log('[FCM] 토큰:', token.slice(0, 20) + '...');

    // 서버에 토큰 저장
    const { updateMyProfile } = await import('../api/client');
    await updateMyProfile({ fcm_token: token });

    return token;
  } catch (err) {
    console.error('[FCM] 토큰 등록 실패:', err);
    return null;
  }
}

/** 토큰 갱신 리스너 */
export function onTokenRefresh(): () => void {
  return messaging().onTokenRefresh(async (newToken) => {
    console.log('[FCM] 토큰 갱신:', newToken.slice(0, 20) + '...');
    try {
      const { updateMyProfile } = await import('../api/client');
      await updateMyProfile({ fcm_token: newToken });
    } catch (err) {
      console.error('[FCM] 토큰 갱신 저장 실패:', err);
    }
  });
}

/** 포그라운드 메시지 수신 리스너 */
export function onForegroundMessage(
  callback: (title: string, body: string, data?: Record<string, string>) => void,
): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? '다시봄';
    const body = remoteMessage.notification?.body ?? '';
    const data = remoteMessage.data as Record<string, string> | undefined;
    callback(title, body, data);
  });
}

/** 백그라운드 메시지 핸들러 등록 (index.js에서 호출) */
export function setBackgroundHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] 백그라운드 메시지:', remoteMessage.messageId);
  });
}
