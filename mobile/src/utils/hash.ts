/**
 * 전화번호 해싱 유틸리티 (React Native 환경용)
 * 연락처 매칭 목적 — 동일 입력에 대해 동일 출력 보장
 */

export async function createHash(input: string): Promise<string> {
  return hashString(input);
}

/**
 * cyrb53 해시 — 충분한 분산성을 가진 비암호학적 해시
 * 연락처 전화번호 매칭용으로 충분
 */
function hashString(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(16).padStart(16, '0');
}
