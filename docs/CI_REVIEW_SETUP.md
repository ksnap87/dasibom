# PR 자동 교차 검증 (Claude × Codex)

PR이 열리면 두 LLM이 독립적으로 리뷰 코멘트를 남기는 자동화.

## 작동 방식

`pull_request` 이벤트에서 두 워크플로우가 병렬 실행:

| 워크플로우 | 모델 | 강점 시각 |
|---|---|---|
| `claude-review.yml` | Claude Opus 4.5 | 안전성, 신중한 추론, 미묘한 타입 이슈 |
| `codex-review.yml` | OpenAI GPT-5 | 보안 패턴, race condition, 라이브러리 오용 |

각각 PR diff(최대 4000줄)를 읽고 한국어로 리뷰 코멘트를 PR에 게시.

## 필요한 시크릿

GitHub 저장소 → Settings → Secrets and variables → Actions:

| 시크릿 이름 | 발급처 | 용도 |
|---|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys | Claude 호출 |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | Codex/GPT 호출 |

> 시크릿 미설정 시 해당 워크플로우는 경고만 남기고 통과 (한쪽만 운영도 가능)

## 비용 (대략)

PR 한 건당:
- Claude Opus 4.5: ~$0.05~0.20 (4000줄 diff 기준)
- GPT-5: ~$0.05~0.30

월 PR 20건이면 합쳐서 $5~10 수준.

## 머지 전 둘 다 통과 강제 (선택)

GitHub → Settings → Branches → main → "Require status checks to pass" 에서:
- `claude-review` 체크
- `codex-review` 체크

둘 다 추가하면 둘 다 성공해야 머지 가능. 다만 LLM 리뷰는 코멘트만 남기고 fail/pass를 판정하지 않으므로, **gating은 사람 리뷰 + 봇 코멘트 참고** 패턴이 실용적.

## 토글

워크플로우 끄고 싶으면:
- `.github/workflows/claude-review.yml` 또는 `codex-review.yml` 파일 이름을 `.disabled` 붙여서 변경
- 또는 해당 시크릿 삭제 (워크플로우는 돌지만 즉시 종료)

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 코멘트 미게시 | 시크릿 누락 | Actions 로그에서 "API_KEY not set" 확인 |
| diff 너무 큼 | 4000줄 cap 초과 | 큰 PR은 작게 쪼개기 |
| 한국어 깨짐 | jq escape 문제 | 워크플로우 로그의 `claude_resp.json` 확인 |
| 모델 응답 빈 값 | 토큰 한도 도달 | `max_tokens` / `max_completion_tokens` 늘리기 |
