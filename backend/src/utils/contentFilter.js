/**
 * 다시봄 콘텐츠 필터
 * 가치관 기반 매칭 앱 — 건전한 만남 보장
 */

// 금칙어 카테고리별 정의
const BANNED_PATTERNS = {
  // 성적 표현 / 음담패설
  sexual: [
    /섹스/i, /성관계/i, /잠자리/i, /원나잇/i, /19금/i,
    /야동/i, /야사/i, /포르노/i, /AV/i, /자위/i,
    /성인용품/i, /콘돔/i, /떡치/i, /따먹/i, /박아/i,
    /빨아/i, /물어/i, /핥아/i, /꼴리/i, /발기/i,
    /보지/i, /자지/i, /성기/i, /가슴\s*만지/i,
    /몸매\s*좋/i, /몸\s*보여/i, /벗어/i, /알몸/i, /누드/i,
    /sex/i, /fuck/i, /porn/i, /nude/i,
  ],

  // 욕설 / 비하
  profanity: [
    /시발/i, /씨발/i, /씨팔/i, /ㅅㅂ/i, /ㅆㅂ/i,
    /병신/i, /ㅂㅅ/i, /지랄/i, /ㅈㄹ/i,
    /개새끼/i, /개색/i, /개년/i, /미친년/i, /미친놈/i,
    /느금마/i, /니미/i, /엠창/i,
    /좆/i, /닥쳐/i, /꺼져/i, /죽어/i, /뒤져/i,
    /장애인/i, /틀딱/i, /노인네/i,
  ],

  // 마약
  drugs: [
    /마약/i, /대마/i, /필로폰/i, /히로뽕/i, /코카인/i,
    /메스암페타민/i, /LSD/i, /엑스터시/i, /각성제/i,
    /아편/i, /헤로인/i, /본드\s*흡입/i, /투약/i,
  ],

  // 자살 / 자해
  selfHarm: [
    /자살/i, /자해/i, /극단적\s*선택/i, /죽고\s*싶/i,
    /살고\s*싶지\s*않/i, /목\s*매/i, /투신/i, /음독/i,
    /유서/i, /번개\s*동반/i,
  ],

  // 금전 요구 / 사기
  scam: [
    /돈\s*보내/i, /송금/i, /계좌\s*번호/i, /입금/i,
    /투자\s*기회/i, /코인\s*투자/i, /주식\s*추천/i,
    /대출/i, /보증금/i, /수수료/i, /비트코인/i,
    /급하게\s*돈/i, /사례금/i,
  ],

  // 개인정보 요구 (초기 대화)
  personalInfo: [
    /주민등록/i, /주민번호/i, /카드\s*번호/i,
    /비밀번호\s*알려/i, /인증번호\s*알려/i,
  ],
};

// 금칙어 카테고리별 경고 메시지
const CATEGORY_MESSAGES = {
  sexual: '성적인 표현이 포함되어 있어요. 다시봄은 진지한 만남을 위한 공간입니다.',
  profanity: '부적절한 표현이 포함되어 있어요. 상대방을 존중하는 대화를 부탁드려요.',
  drugs: '불법 약물 관련 내용은 전송할 수 없습니다.',
  selfHarm: '도움이 필요하시면 자살예방상담전화 1393으로 연락해주세요.',
  scam: '금전 거래 관련 내용은 전송이 제한됩니다. 사기 피해에 주의하세요.',
  personalInfo: '개인정보를 채팅으로 공유하는 것은 위험합니다.',
};

/**
 * 메시지 검사
 * @param {string} text - 검사할 텍스트
 * @returns {{ blocked: boolean, category?: string, message?: string }}
 */
function filterContent(text) {
  if (!text || typeof text !== 'string') return { blocked: false };

  for (const [category, patterns] of Object.entries(BANNED_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          blocked: true,
          category,
          message: CATEGORY_MESSAGES[category] || '부적절한 내용이 포함되어 있습니다.',
        };
      }
    }
  }

  return { blocked: false };
}

/**
 * 프로필 텍스트 검사 (자기소개, 이름 등)
 */
function filterProfileContent(text) {
  return filterContent(text);
}

module.exports = { filterContent, filterProfileContent, BANNED_PATTERNS, CATEGORY_MESSAGES };
