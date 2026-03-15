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
