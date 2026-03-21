# 다시봄 (Dasibom)

시니어 대상 소개팅/매칭 앱. 가치관 기반 호환성 매칭.

## 기술 스택

- **모바일**: React Native 0.84 + TypeScript, React Navigation 7, Zustand
- **백엔드**: Express.js (Node 18+), Railway 배포
- **DB/Auth/Storage**: Supabase (Auth + PostgreSQL + Storage + Realtime)
- **푸시**: Firebase Cloud Messaging (firebase-admin)
- **로그인**: 카카오 SDK → 백엔드에서 Supabase 세션 발급

## 프로젝트 구조

```
dasibom/
├── mobile/src/
│   ├── screens/        # 11개 화면 (Auth, Suggestions, Matches, Chat 등)
│   ├── navigation/     # Bottom Tab 3개 + Stack
│   ├── api/client.ts   # Axios + 토큰 리프레시 + 재시도 + 중복요청 방지
│   ├── store/          # Zustand (authStore)
│   ├── services/       # FCM 푸시
│   ├── components/     # Toast, ErrorBoundary, SkeletonLoader
│   ├── constants/      # 색상, 제한값, 스토리지 키
│   ├── types/          # Profile, Match, Message 인터페이스
│   └── config.ts       # Supabase URL, API URL
├── backend/
│   ├── index.js        # Express 진입점 (PORT 3000)
│   └── src/
│       ├── routes/     # auth, profiles, matches, messages, photos, credits
│       ├── middleware/  # verifyToken (Supabase service role)
│       └── utils/      # scoring.js (호환성 점수), push.js (FCM)
└── supabase/           # 마이그레이션
```

## API 엔드포인트

| 경로 | 설명 |
|------|------|
| `POST /api/auth/kakao` | 카카오 로그인 → Supabase 세션 |
| `GET/PUT /api/profiles/me` | 내 프로필 조회/수정 |
| `POST /api/profiles/interest` | 좋아요/패스 |
| `GET /api/matches/suggestions` | 추천 후보 (호환성 점수 기반) |
| `GET /api/matches` | 상호 매칭 목록 |
| `GET/POST /api/messages` | 채팅 메시지 |
| `POST/GET/DELETE /api/photos` | 사진 관리 (Supabase Storage) |
| `POST /api/credits/verify-purchase` | 구글플레이 결제 검증 |

## 주요 상수

- 일일 추천: 5명, 크레딧당 추가: 5명
- 사진 최대: 5장, 5MB, JPEG/PNG/WebP
- 메시지 최대: 500자, 자기소개 최대: 100자
- 색상: primary `#E8556D`, bg `#FFF8F5`

## 코드 규칙

- **tulip 단어 사용 금지** (코드, 경로, 파일명 모두)
- TypeScript 사용, PascalCase(컴포넌트/타입), camelCase(함수/변수), UPPERCASE(상수)
- 한국어 변수명 사용 안 함 (영어로만)
- 화면 스타일: 파일 상단 `const C = {...}` 로컬 색상 + `StyleSheet.create()`
- API 호출: `api/client.ts`의 axios 인스턴스 사용 (직접 fetch 금지)
- 상태관리: Zustand `useAuthStore` (전역), `useState` (로컬 UI)

## Supabase 테이블

profiles, interests, matches, messages, profile_photos, blocks, reports, contact_hashes, purchase_history

## 환경변수 (백엔드)

PORT, SUPABASE_URL, SUPABASE_SERVICE_KEY, KAKAO_AUTH_SECRET, FIREBASE_SERVICE_ACCOUNT_JSON
