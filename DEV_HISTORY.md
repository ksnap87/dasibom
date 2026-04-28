# 다시봄 — 개발 히스토리

## Sprint 1–3: 핵심 기능 구축
- Supabase 인증 + 프로필 CRUD
- 8단계 가치관 설문 (40+ 항목)
- 호환성 점수 알고리즘 (100점 만점)
- 추천 시스템 (하루 5명 제한, 점수순)
- 실시간 채팅 (Supabase Broadcast)
- Railway 백엔드 배포
- GitHub Actions 자동 APK 빌드

## Sprint 4: 매칭 고도화
- 추천 카드 미리 볼 질문 5개
- 절대 안 되는 조건 3개 필터링
- 지역 필터 (같은 시/도 · 수도권 · 전국)
- 매칭 후 상대 전체 프로필 확인
- 본인인증(모의) 후 채팅 시작
- 크레딧 기반 가치관 수정

## Sprint 5: 안전 & 관리
- 신고 기능 (4가지 사유 + 상세 내용)
- 차단/차단 해제
- 계정 삭제 (CASCADE 자동 정리)
- 크레딧 서버 저장 (Supabase profiles.credits)
- 프로필 Q&A 형식 가치관 전체 노출
- 설문 필수 답변 검증

## Sprint 6: UX 개선 + 인프라 (2026-03-15)

### UI/UX 개선
- 스플래시 스크린 (fade-in + scale 애니메이션, 2초 후 전환)
- SkeletonLoader 컴포넌트 (card / match-row / profile 3종)
- Toast 알림 시스템 (좋아요/패스 피드백)
- 추천 카드 스와이프 애니메이션 (좋아요 → 오른쪽, 패스 → 왼쪽)
- 신고 UI를 Alert → Modal 다이얼로그로 통일 (ChatRoom, FriendProfile)
- 채팅방 아이스브레이커 메시지 제안 (빈 대화 시 3개 제안)
- 매칭 빈 상태 개선 ("추천으로 가기" CTA 버튼)
- 앱 아이콘 리소스 (adaptive icon)

### FCM 푸시 알림
- Firebase 프로젝트 생성 (dasibom-app)
- 모바일: @react-native-firebase/messaging 연동
  - 권한 요청 (Android 13+ POST_NOTIFICATIONS)
  - 디바이스 토큰 발급 → 서버 저장 (profiles.fcm_token)
  - 토큰 갱신 리스너
  - 포그라운드 메시지 수신 (Alert 표시)
  - 백그라운드 메시지 핸들러
- 백엔드: firebase-admin SDK
  - 매칭 성사 시 양쪽에게 푸시 ("새로운 매칭!")
  - 새 메시지 시 상대방에게 푸시 (발신자 이름 + 메시지 미리보기)
  - 만료 토큰 자동 처리

### Supabase 마이그레이션
- fcm_token 컬럼 추가 (profiles)
- reports 테이블 + RLS 정책
- blocks 테이블 + RLS 정책
- 성능 인덱스 8개 생성

### 인프라
- google-services.json 배치
- Firebase 서비스 계정 키 → 백엔드 .env
- FCM Cloud Messaging API 활성화
- Supabase CLI 연동 (supabase link + db push)

## Sprint 7: 전체 앱 버그 점검 & 수정 (2026-03-21)

### 글씨 크기 기능 구현
- fontStore.ts (Zustand) — 글씨 크기 상태 관리 (기본/크게/매우 크게, 배율 1.0/1.2/1.4)
- App.tsx에서 Text.render 래핑 → 모든 Text 컴포넌트에 자동 배율 적용
- ProfileScreen 설정에서 변경 시 즉시 앱 전체 반영

### 모바일 버그 수정
- PhoneVerificationScreen: 타이머 interval unmount 시 미정리 → useEffect cleanup 추가 (메모리 누수 수정)
- authStore: onAuthStateChange 리스너 loadSession 호출마다 중복 등록 → 모듈 레벨 1회 등록으로 변경
- authStore: loadCredits parseInt NaN 방어 추가
- Toast: 싱글톤 리스너 다중 마운트 시 덮어쓰기 → Set 기반으로 변경
- client.ts: 사진 업로드 시 Content-Type 수동 설정 제거 (boundary 누락 버그)
- AppNavigator: FCM ref 로그아웃 시 리셋 안 됨 → isAuthenticated 감지하여 리셋
- QuestionnaireScreen: 크레딧 차감 순서 수정 (프로필 업데이트 성공 후 차감)
- SuggestionsScreen: compatibility_score null 체크, name null 체크, hobby 한국어 레이블 매핑
- FriendProfileScreen: birth_year/name null 체크 추가 (NaN세 크래시 방지)
- 시스템 글씨 크기 확대 비활성화 (Text.defaultProps.allowFontScaling = false)

### 백엔드 버그 수정
- contentFilter.js: regex /gi → /i (lastIndex 리셋 안 되어 50% 확률 필터 통과 버그)
- matches.js: familySimilarityBonus 0-1 → 0-100 스케일 통일 (bonus 효과 없던 버그)
- matches.js: suggestions/matches 라우트에 try/catch 추가
- photos.js: 사진 삭제 시 Supabase Storage에서도 파일 삭제
- photos.js: set-profile/set-background URL 소유권 검증 추가 (보안)

## Sprint 8: Google Play 결제 검증 (2026-03-21)

### 백엔드
- `googleapis` 패키지 추가
- `playStore.js` 유틸리티 생성 — Google Play Developer API v3 연동
  - 서비스 계정 인증 (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON 환경변수)
  - `verifyPurchase()` — 구매 영수증 검증 (purchaseState 확인)
  - `acknowledgePurchase()` — 소모성 상품 승인 (3일 내 미승인 시 자동 환불 방지)
- `credits.js` 전면 재구성:
  1. Google Play API로 영수증 검증 (위조 토큰 차단)
  2. 중복 구매 방지 (purchase_token UNIQUE 제약)
  3. 크레딧 지급 (atomic RPC)
  4. 구매 기록 저장 (order_id 포함)
  5. Google Play acknowledge
- 테스트용 `/api/credits/add`에 정수 검증 추가
- 프로덕션에서 Google Play 미설정 시 결제 차단

### Supabase 마이그레이션
- `purchase_history`에 `order_id` 컬럼 추가
- `purchase_token` UNIQUE 제약 추가 (DB 레벨 중복 방지)

## Sprint 9: 디자인 시스템 + IAP v14 + CI 자동 검증 (2026-04-25)

### Theme System 도입
- `mobile/src/theme/tokens.ts` — colors / spacing / radius / typography 토큰 정의
- 컴포넌트 5종: `Button` / `Card` / `Tag` / `Badge` / `ScreenHeader`
- 12개 화면 theme 시스템 기반으로 마이그레이션 (Auth / Welcome / Splash / Profile / Friend / Suggestions / Matches / ChatRoom / CreditStore / PhoneVerification / Questionnaire / AppNavigator)

### react-native-iap v14 마이그레이션 (CreditStoreScreen)
- `getProducts` → `fetchProducts`
- `requestPurchase` 새 시그니처 (`request.android.skus` / `request.ios.sku`)
- `ProductPurchase` → `Purchase` 타입
- `transactionReceipt` → `purchaseToken`
- `ErrorCode.UserCancelled`, `displayPrice`, `p.id` 매칭
- ⚠️ Nitro 모듈로 내부 구현 변경 — 타입체크 통과가 런타임 보장하지 않음, **실기기 결제 사이클 테스트 필수**

### 코드 품질 정리
- TypeScript 에러 14 → **0**
- ESLint 에러 27 → **0** (경고 76은 inline-style — 동작 무관)
- `Profile` / `SuggestionProfile`에 `nickname?: string` 보강
- `api/client.ts` 리턴 타입 `Promise<AxiosResponse<T>>`로 정확화, `setTimeout` 시그니처 수정
- ESLint `_`-prefix ignore 패턴 추가
- `ChatRoomScreen.handleRetry` `useCallback`로 안정화

### PR 자동 교차 검증 CI
- `.github/workflows/claude-review.yml` — Claude Opus 4.5가 PR diff를 한국어로 리뷰 후 코멘트 게시
- `.github/workflows/codex-review.yml` — OpenAI GPT-5가 동일 diff 리뷰 후 코멘트 게시
- 두 모델이 서로 다른 시각으로 포커싱 (Claude: 신중함/타입, Codex: 보안/race)
- diff 4000줄 cap, 시크릿(`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) 없으면 워크플로우 통과 (선택적 운영)
- `docs/CI_REVIEW_SETUP.md` — 시크릿 발급 / 비용 / 머지 게이팅 가이드

### 자동 빌드 · 릴리즈 흐름 (현재 상태)
- **트리거**: `main` push (자동) + `workflow_dispatch` (수동)
- **빌드**: `.github/workflows/build-apk.yml` — Node 20 + JDK 17 + Android SDK 36 → APK + AAB
- **출력**: GitHub Releases에 `app-release.apk` (~86 MB) + `intermediary-bundle.aab` (~186 MB) 자동 첨부
- **시크릿**: `CONFIG_TS`, `GOOGLE_SERVICES_JSON`, `RELEASE_KEYSTORE_BASE64`
- **최신**: [v0.0.1-202604250454](https://github.com/ksnap87/dasibom/releases/tag/v0.0.1-202604250454) (#7 + #8 통합 빌드)

### PR 정리
- **#8** (CI 자동 교차 검증, 27 파일) — squash merge → main. PR #7 코드까지 함께 통합됨
- **#7** (theme + IAP v14) — #8 squash에 포함되어 main 반영 완료, 별도 머지 불필요
