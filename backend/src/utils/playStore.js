/**
 * Google Play 구매 검증 유틸리티
 * Google Play Developer API v3를 사용하여 인앱 구매 영수증을 검증합니다.
 */
const { google } = require('googleapis');

let androidPublisher = null;

// 서비스 계정 초기화 (환경변수에서 JSON 키 로드 — push.js와 동일 패턴)
if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
  let serviceAccount = null;
  try {
    serviceAccount = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  } catch {
    try {
      const fixed = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.replace(/\n/g, '\\n');
      serviceAccount = JSON.parse(fixed);
    } catch (e2) {
      console.warn('[PlayStore] 서비스 계정 JSON 파싱 실패:', e2.message);
    }
  }

  if (serviceAccount) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
      androidPublisher = google.androidpublisher({ version: 'v3', auth });
      console.log('[PlayStore] Google Play 검증 서비스 초기화 완료');
    } catch (e) {
      console.warn('[PlayStore] 초기화 실패:', e.message);
    }
  }
} else {
  console.warn('[PlayStore] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON 미설정 — 구매 검증 비활성화');
}

/**
 * Google Play에서 구매 영수증 검증
 * @param {string} packageName - 앱 패키지명 (com.dasibom)
 * @param {string} productId - 상품 ID (credit_3, credit_10, credit_30)
 * @param {string} purchaseToken - Google Play 구매 토큰
 * @returns {Promise<object>} purchaseData - { purchaseState, consumptionState, acknowledgementState, orderId, ... }
 */
async function verifyPurchase(packageName, productId, purchaseToken) {
  if (!androidPublisher) {
    throw new Error('Google Play 검증 서비스가 초기화되지 않았습니다.');
  }

  const result = await androidPublisher.purchases.products.get({
    packageName,
    productId,
    token: purchaseToken,
  });

  return result.data;
}

/**
 * 구매 승인 (acknowledge) — 소모성 상품은 3일 내 승인하지 않으면 자동 환불됨
 * @param {string} packageName
 * @param {string} productId
 * @param {string} purchaseToken
 */
async function acknowledgePurchase(packageName, productId, purchaseToken) {
  if (!androidPublisher) return;

  await androidPublisher.purchases.products.acknowledge({
    packageName,
    productId,
    token: purchaseToken,
  });
}

/**
 * Google Play 검증 서비스가 초기화되었는지 확인
 */
function isInitialized() {
  return androidPublisher !== null;
}

module.exports = { verifyPurchase, acknowledgePurchase, isInitialized };
