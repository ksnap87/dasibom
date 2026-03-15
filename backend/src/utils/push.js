const admin = require('firebase-admin');

// Firebase Admin 초기화 (환경변수에서 서비스 계정 키 로드)
if (!admin.apps.length) {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      // private_key 내 실제 줄바꿈을 \\n으로 치환 후 재시도
      try {
        const fixed = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\n/g, '\\n');
        serviceAccount = JSON.parse(fixed);
      } catch (e2) {
        console.warn('[Push] FIREBASE_SERVICE_ACCOUNT_JSON 파싱 실패:', e2.message);
      }
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.warn('[Push] FIREBASE_SERVICE_ACCOUNT_JSON 미설정 — 푸시 비활성화');
  }
}

/**
 * 단일 사용자에게 푸시 발송
 * @param {string} fcmToken - 수신자의 FCM 디바이스 토큰
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {object} [data] - 추가 데이터 (네비게이션 등)
 */
async function sendPush(fcmToken, title, body, data = {}) {
  if (!admin.apps.length || !fcmToken) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { channelId: 'dasibom_default', sound: 'default' },
      },
    });
  } catch (err) {
    // 만료된 토큰 등은 무시
    if (err.code === 'messaging/registration-token-not-registered') {
      console.log('[Push] 만료된 토큰:', fcmToken.slice(0, 20));
    } else {
      console.error('[Push] 발송 실패:', err.message);
    }
  }
}

/**
 * 특정 유저에게 푸시 (Supabase에서 토큰 조회 후 발송)
 */
async function sendPushToUser(supabase, userId, title, body, data = {}) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('fcm_token')
    .eq('id', userId)
    .single();

  if (profile?.fcm_token) {
    await sendPush(profile.fcm_token, title, body, data);
  }
}

module.exports = { sendPush, sendPushToUser };
