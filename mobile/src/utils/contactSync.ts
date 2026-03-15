/**
 * 연락처 동기화 유틸리티
 * 기기 연락처의 전화번호를 해시하여 서버에 업로드
 * → 추천에서 지인 제외
 */
import { Platform, PermissionsAndroid } from 'react-native';
import Contacts from 'react-native-contacts';
import { createHash } from './hash';
import { syncContactHashes } from '../api/client';

/**
 * 전화번호를 E.164 형태로 정규화
 * 010-1234-5678 → +821012345678
 */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;

  // 한국 번호
  if (digits.startsWith('010') || digits.startsWith('011') || digits.startsWith('016') || digits.startsWith('017') || digits.startsWith('018') || digits.startsWith('019')) {
    return `+82${digits.slice(1)}`;
  }
  if (digits.startsWith('82')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `+82${digits.slice(1)}`;
  }
  return null; // 해외 번호는 무시
}

/**
 * 연락처 권한 요청
 */
async function requestContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: '연락처 접근 권한',
        message: '지인이 추천에 나타나지 않도록 연락처를 확인합니다.\n전화번호는 암호화되어 저장됩니다.',
        buttonPositive: '허용',
        buttonNegative: '거부',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  // iOS: react-native-contacts가 자동으로 권한 요청
  const permission = await Contacts.checkPermission();
  if (permission === 'authorized') return true;
  if (permission === 'denied') return false;

  const result = await Contacts.requestPermission();
  return result === 'authorized';
}

/**
 * 연락처 읽기 → 해시 → 서버 업로드
 * 앱 시작 시 또는 설정에서 호출
 */
export async function syncContacts(): Promise<{ synced: number } | null> {
  try {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) return null;

    const contacts = await Contacts.getAll();

    // 모든 전화번호 수집 및 정규화
    const phoneNumbers: string[] = [];
    for (const contact of contacts) {
      for (const phone of contact.phoneNumbers) {
        const normalized = normalizePhone(phone.number);
        if (normalized) phoneNumbers.push(normalized);
      }
    }

    // 중복 제거
    const unique = [...new Set(phoneNumbers)];
    if (unique.length === 0) return { synced: 0 };

    // 해시 생성
    const hashes = await Promise.all(unique.map(p => createHash(p)));

    // 서버에 업로드
    const result = await syncContactHashes(hashes);
    return result;
  } catch (err) {
    console.warn('연락처 동기화 실패:', err);
    return null;
  }
}
