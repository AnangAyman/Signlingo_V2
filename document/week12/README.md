# Week 12 Documents

- `weekly_plan.md`: 이번 주 계획 문서
- `todo.md`: Week 9 / Week 10에서 이어받은 미완료 항목 정리
- `korean_translation_plan.md`: 한국어 번역 작업 분해, 동적 데이터 다국어화/토글 스타일 deferred 항목 포함
- `korean_translation_inventory.md`: 템플릿 기준 번역 우선순위와 현재 적용 범위
- `translation_style_guide.md`: 번역 대상과 영어 유지 대상 기준
- `google_auth_review.md`: Google 계정 인증/로그인 검토
- `google_oauth_verification_review.md`: Google OAuth와 이메일 인증 정책 검토
- `aihub_korean_sign_pipeline.md`: AI Hub 수화 데이터 다운로드/가공 설계
- `aihub_fingerspelling_download.md`: AI Hub 지문자 subset 다운로드 가이드
- `development_merge_2026-05-22.md`: `origin/development` 병합으로 들어온 프론트/API/설정 변경 요약
- `frontend_translation_scope.md`: 새 `frontend/` 기준 번역 적용 현황과 우선 작업 범위
- `frontend_translation_review_checklist.md`: 프론트 번역 커밋별 검토 체크리스트

## Current Translation Status

- 영어 기본값 + `EN / KO` 토글 구조 적용
- 고정 UI 문구 기준으로 주요 템플릿 번역 리소스 연결 완료
- `ml_game`는 템플릿, JS 런타임 문구, API 질문 프롬프트까지 번역 구조 연결 완료
- 프론트 기준 핵심 번역 범위는 `login`, `signup`, `lessons`, `ai-game`, `placeholder`까지 반영됨
- `gamification`, `leaderboard`, 랜딩 공통 컴포넌트의 잔여 하드코딩도 정리됨
- 2026-06-04 기준 앱 고유 컴포넌트의 이미지 alt/aria-label, 리그 표시명, 게임화 mock 표시 문구도 locale JSON으로 이동됨
- 이후 검토는 `frontend_translation_review_checklist.md` 기준으로 커밋 단위로 진행
- 토글 위치/시각 스타일은 프론트엔드 정리 이후 보정 예정
- 공용 UI primitive 접근성 문구와 동적 데이터(`shop_items` 등) 다국어화는 문서 계획만 유지
