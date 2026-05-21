# Korean Translation Inventory

## 목적
실제 템플릿 기준으로 한국어 번역 대상을 끊어서 작업 순서를 고정한다.
영어는 기본 언어로 유지하고, 한국어는 선택형 번역만 추가한다.

주의:
- 이 문서는 Django 템플릿 기준 inventory다.
- `origin/development` 병합 이후 프론트 기준 inventory는 `document/week12/frontend_translation_scope.md`에서 별도로 관리한다.
- 프론트 `login/signup/lessons/ai-game/gamification/leaderboard/common landing` 번역 현황은 이 문서가 아니라 `frontend_translation_scope.md`를 기준으로 본다.

---

## 완료된 적용 범위

### 인증
- `templates/login.html`
- `templates/sign_up.html`
- `templates/forgot_password.html`
- `templates/reset_password.html`

### 대시보드 / 내비게이션
- `templates/dashboard.html`
- `templates/roadmap.html`
- `templates/edit_account.html`
- `templates/courses_final.html`
- `templates/leaderboard.html`
- `templates/shop.html`
- `templates/premium.html`
- `templates/package.html`

### 학습 / 게임
- `templates/video_learning.html`
- `templates/game_page.html`
- `templates/ml_game.html`
- `templates/magic_touch_game.html`
- `templates/result_summary.html`
- `templates/machine_learning.html`

### 랜딩 / 시작 화면
- `templates/landing_page.html`
- `templates/start.html`
- `templates/payment.html`

---

## 초기 우선순위 기준

### 인증
- `templates/login.html`
- `templates/sign_up.html`
- `templates/forgot_password.html`
- `templates/reset_password.html`

### 대시보드 / 내비게이션
- `templates/dashboard.html`
- `templates/roadmap.html`
- `templates/edit_account.html`

### 학습
- `templates/video_learning.html`
- `templates/game_page.html`
- `templates/ml_game.html`
- `templates/result_summary.html`

---

## 후속 정리 대상

- `templates/users.html` 스타일 보강 필요
- `shop_items` 등 동적 데이터 다국어화
- 프론트엔드 반영 후 토글 위치/형태 통일
- 테스트 코드와 실제 렌더링 문구 불일치 여부 점검
- 프론트 공용 UI primitive 접근성 문구 정리
- 프론트 동적 데이터 다국어화

---

## 우선 번역 키 후보

### 인증 공통
- page title
- form label / placeholder
- submit button
- Google login button
- validation error
- OAuth error
- language toggle label

### 대시보드 공통
- sidebar menu
- welcome text
- progress label
- premium card text
- streak text

### 학습 공통
- lesson intro
- question prompt
- result message
- retry / continue / skip button

---

## 비고

- 현재는 주요 템플릿 전반에 번역 리소스가 연결된 상태다.
- 모든 키는 영어 원문을 기준값으로 삼고, 한국어는 대응 리소스로만 추가한다.
- 영어 유지 여부는 `document/week12/translation_style_guide.md` 기준으로 판단한다.
- 토글 위치와 시각 디자인은 프론트엔드 정리 이후 별도 보정한다.
- `ml_game`는 다음 항목까지 번역 연결을 완료했다.
  - 상단 lesson title
  - 문제 프롬프트 API 응답
  - JS 런타임 에러/피드백 문구
  - skip/start/retry/complete 문구
