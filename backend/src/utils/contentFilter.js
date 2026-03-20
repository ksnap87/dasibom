/**
 * 다시봄 콘텐츠 필터
 * 가치관 기반 매칭 앱 — 건전한 만남 보장
 */

// 금칙어 카테고리별 정의
const BANNED_PATTERNS = {
  // 성적 표현 / 음담패설
  sexual: [
    /섹스/gi, /성관계/gi, /잠자리/gi, /원나잇/gi, /19금/gi,
    /야동/gi, /야사/gi, /포르노/gi, /AV/gi, /자위/gi,
    /성인용품/gi, /콘돔/gi, /떡치/gi, /따먹/gi, /박아/gi,
    /빨아/gi, /물어/gi, /핥아/gi, /꼴리/gi, /발기/gi,
    /보지/gi, /자지/gi, /성기/gi, /가슴\s*만지/gi,
    /몸매\s*좋/gi, /몸\s*보여/gi, /벗어/gi, /알몸/gi, /누드/gi,
    /sex/gi, /fuck/gi, /porn/gi, /nude/gi,
  ],

  // 욕설 / 비하
  profanity: [
    /시발/gi, /씨발/gi, /씨팔/gi, /ㅅㅂ/gi, /ㅆㅂ/gi,
    /병신/gi, /ㅂㅅ/gi, /지랄/gi, /ㅈㄹ/gi,
    /개새끼/gi, /개색/gi, /개년/gi, /미친년/gi, /미친놈/gi,
    /느금마/gi, /니미/gi, /엠창/gi,
    /좆/gi, /닥쳐/gi, /꺼져/gi, /죽어/gi, /뒤져/gi,
    /장애인/gi, /틀딱/gi, /노인네/gi,
  ],

  // 마약
  drugs: [
    /마약/gi, /대마/gi, /필로폰/gi, /히로뽕/gi, /코카인/gi,
    /메스암페타민/gi, /LSD/gi, /엑스터시/gi, /각성제/gi,
    /아편/gi, /헤로인/gi, /본드\s*흡입/gi, /투약/gi,
  ],

  // 자살 / 자해
  selfHarm: [
    /자살/gi, /자해/gi, /극단적\s*선택/gi, /죽고\s*싶/gi,
    /살고\s*싶지\s*않/gi, /목\s*매/gi, /투신/gi, /음독/gi,
    /유서/gi, /번개\s*동반/gi,
  ],

  // 금전 요구 / 사기
  scam: [
    /돈\s*보내/gi, /송금/gi, /계좌\s*번호/gi, /입금/gi,
    /투자\s*기회/gi, /코인\s*투자/gi, /주식\s*추천/gi,
    /대출/gi, /보증금/gi, /수수료/gi, /비트코인/gi,
    /급하게\s*돈/gi, /사례금/gi,
  ],

  // 개인정보 요구 (초기 대화)
  personalInfo: [
    /주민등록/gi, /주민번호/gi, /카드\s*번호/gi,
    /비밀번호\s*알려/gi, /인증번호\s*알려/gi,
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
