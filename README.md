# 🌸 다시봄 — Senior Dating App MVP

한국 시니어(50대 이상)를 위한 가치관 기반 매칭 앱.

## 프로젝트 구조

```
dasibom/
├── supabase/schema.sql      # DB 스키마 (SQL Editor에 붙여넣기)
├── backend/                 # Node.js + Express API
│   ├── index.js
│   ├── src/
│   │   ├── middleware/auth.js
│   │   ├── routes/{profiles,matches,messages}.js
│   │   └── utils/scoring.js  ← 호환성 점수 알고리즘
│   └── .env.example
└── mobile/                  # React Native (Android)
    ├── App.tsx
    ├── src/
    │   ├── navigation/AppNavigator.tsx
    │   ├── screens/{Auth,Questionnaire,Suggestions,Matches,Profile,ChatRoom}Screen.tsx
    │   ├── api/client.ts
    │   ├── store/authStore.ts
    │   └── types/index.ts
    └── .env.example
```

---

## 1단계: Supabase 설정

1. [supabase.com](https://supabase.com)에서 무료 프로젝트 생성
2. **SQL Editor** → `supabase/schema.sql` 전체 내용 붙여넣고 실행
3. **Project Settings → API**에서 아래 값 복사:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (백엔드 전용, 절대 앱에 포함 금지)
4. **Authentication → Settings**에서 "Enable email confirmations" **비활성화** (개발 중 편의)

---

## 2단계: 백엔드 실행

```bash
cd dasibom/backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 열어서 SUPABASE_URL, SUPABASE_SERVICE_KEY 입력

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 헬스 체크
curl http://localhost:3000/health
# {"status":"ok","app":"다시봄 API"}
```

---

## 3단계: Android 에뮬레이터 설정 (macOS)

### 3-1. 개발 환경 설치

```bash
# Homebrew로 Node.js 설치 (이미 있으면 생략)
brew install node

# JDK 17 설치
brew install --cask zulu@17

# ~/.zshrc 에 추가
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

source ~/.zshrc
```

### 3-2. Android Studio 설치 및 AVD 생성

1. [Android Studio](https://developer.android.com/studio) 다운로드 & 설치
2. Android Studio 실행 → **More Actions → SDK Manager**
   - SDK Platforms: **Android 14 (API 34)** 체크 후 Apply
   - SDK Tools: **Android SDK Build-Tools**, **Android Emulator** 체크 확인
3. **More Actions → Virtual Device Manager → Create Device**
   - Phone → Pixel 6 선택
   - System Image: API 34 (x86_64) 다운로드 & 선택
   - 이름: `다시봄_Dev` → Finish
4. ▶ 버튼으로 에뮬레이터 실행

### 3-3. React Native 프로젝트 초기화

```bash
# React Native 프로젝트 생성 (TypeScript 템플릿)
npx react-native@latest init 다시봄 --template react-native-template-typescript
cd 다시봄

# dasibom/mobile/의 소스 파일을 다시봄/ 프로젝트에 복사
cp -r ../dasibom/mobile/src ./
cp ../dasibom/mobile/App.tsx ./

# 추가 의존성 설치
npm install \
  @react-native-async-storage/async-storage \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-navigation/bottom-tabs \
  @supabase/supabase-js \
  axios \
  zustand \
  react-native-screens \
  react-native-safe-area-context

# iOS Pod (macOS에서 iOS 빌드 시 필요, Android만이면 생략 가능)
# cd ios && pod install && cd ..
```

### 3-4. 환경 변수 설정

`다시봄/src/store/authStore.ts` 와 `다시봄/src/api/client.ts`를 열어서
상단의 상수를 실제 값으로 교체:

```typescript
// authStore.ts
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// client.ts
const API_BASE = 'http://10.0.2.2:3000'; // Android 에뮬레이터에서 localhost = 10.0.2.2
```

> **참고:** `react-native-config` 또는 `@env` 패키지로 `.env` 파일에서 읽을 수도 있습니다.

### 3-5. Android 실행

```bash
# 에뮬레이터가 실행 중인 상태에서 (다른 터미널에서 백엔드도 실행 중이어야 함)
npx react-native run-android
```

첫 빌드는 5–10분 소요됩니다.

---

## 4단계: 앱 사용 흐름

```
회원가입 (이메일/비번)
  ↓
8단계 설문 완료
  ↓
추천 탭: 매칭 후보 목록 (호환성 점수 순)
  ↓
"관심 있어요" 버튼 → 상대도 관심 표현 시 매칭
  ↓
매칭 탭: 매칭된 상대와 채팅 시작
```

---

## 호환성 점수 알고리즘

`backend/src/utils/scoring.js`에 구현. 총 100점.

| 항목 | 가중치 | 기준 |
|------|--------|------|
| 관계 목표 | 25점 | 매칭 테이블 (결혼↔결혼=1.0, 결혼↔동반자=0.4, …) |
| 종교 | 20점 | 동일=1.0, 이종=0.25, 무교 혼합=0.55 + 중요도 보정 |
| 생활 방식 | 20점 | 흡연·음주·운동 근접도 평균 |
| 가족 가치 | 15점 | family_importance 차이 역산 |
| 취미 | 10점 | Jaccard 계수 × 3 (소수 겹침 부스트) |
| 사교 방식 | 10점 | social_frequency 근접도 |

---

## API 엔드포인트 요약

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/api/profiles/me` | 내 프로필 조회 |
| PUT | `/api/profiles/me` | 프로필 저장/업데이트 |
| GET | `/api/profiles/:id` | 타인 프로필 조회 |
| POST | `/api/profiles/interest` | 관심 표현 (like/pass) |
| GET | `/api/matches/suggestions` | 추천 후보 목록 (점수순) |
| GET | `/api/matches` | 매칭된 상대 목록 |
| GET | `/api/messages/:matchId` | 대화 메시지 조회 |
| POST | `/api/messages` | 메시지 전송 |
| PATCH | `/api/messages/read/:matchId` | 읽음 처리 |

---

## 배포

백엔드는 Railway에 배포되어 있습니다.
- **URL**: `https://dasibom-production.up.railway.app`
- **헬스 체크**: `GET /health` → `{"status":"ok","app":"다시봄 API"}`

```bash
# 재배포 시
cd dasibom/backend
railway up
```

---

## APK 빌드 및 설치

```bash
cd dasibom/mobile/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 로드맵

- [x] Supabase Realtime (Broadcast) 채팅 실시간화
- [x] Railway 백엔드 배포
- [ ] 카카오 / PASS 본인인증 실인증 연동
- [ ] 사진 업로드 (Supabase Storage)
- [ ] 푸시 알림 (Firebase FCM)
- [ ] Play Store 출시
- [ ] 프리미엄 구독 (매칭 우선순위, 무제한 관심 표현)
