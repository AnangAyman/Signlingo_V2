# Frontend Translation Scope — 2026-05-22

## 목적
`frontend/` 기준으로 현재 번역이 어디까지 적용되어 있고, 앞으로 어떤 화면을 우선 번역해야 하는지 다시 정의한다.

이번 문서는 Django 템플릿 번역 문서와 분리해서, Next.js 프론트 기준 범위만 다룬다.

---

## 현재 전제

프론트에는 이미 i18n 인프라가 들어와 있다.

주요 파일:
- `frontend/lib/i18n.ts`
- `frontend/components/common/I18nProvider.tsx`
- `frontend/components/common/LanguageToggle.tsx`

현재 등록된 namespace:
- `common`
- `dashboard`
- `gamification`
- `leaderboard`
- `leagues`
- `placeholder`
- `auth`
- `lessons`
- `ai-game`

즉:
- 언어 토글 구조는 이미 존재
- locale JSON도 일부 존재
- 하지만 모든 페이지가 실제 번역 키를 쓰는 상태는 아님

---

## 현재 상태 분류

### 1. 이미 번역 구조가 연결된 영역

다음 영역은 `useTranslation()`과 locale JSON을 사용하고 있다.

- 랜딩 공통 컴포넌트
  - `frontend/components/navbar.tsx`
  - `frontend/components/hero-section.tsx`
  - `frontend/components/features-section.tsx`
  - `frontend/components/leagues-section.tsx`
  - `frontend/components/testimonials-section.tsx`
  - `frontend/components/pricing-section.tsx`
  - `frontend/components/cta-section.tsx`
  - `frontend/components/footer.tsx`
- 앱 헤더
  - `frontend/components/app-header.tsx`
- 대시보드
  - `frontend/app/dashboard/page.tsx`
- 리더보드
  - `frontend/components/leaderboard/*`
- 게임화 / 리그
  - `frontend/components/gamification/*`
  - `frontend/components/leagues/*`
- placeholder 기반 페이지
  - `frontend/app/profile/page.tsx`
  - `frontend/app/notifications/page.tsx`
  - `frontend/app/settings/page.tsx`

### 2. 현재 번역 연결이 완료된 핵심 화면

- `frontend/app/login/page.tsx`
- `frontend/app/signup/page.tsx`
- `frontend/app/lessons/page.tsx`
- `frontend/app/ai-game/page.tsx`

### 3. 후속 정리 대상

- `frontend/components/ui/*` 내부의 공용 접근성 문구
  - 예: `More`, `Previous slide`, `Next slide`, `Toggle Sidebar`
- API/모델에서 오는 동적 데이터의 locale-aware delivery
- `leagues` / `dashboard` / `store` 등 훅 계층의 실패 메시지 재점검
- 프론트 디자인 확정 후 토글 위치/형태 최종 정리

---

## 우선 번역 대상

### 1순위: 공용 UI 접근성 문구

- `frontend/components/ui/*`
- `frontend/components/common/*`
- `frontend/components/app-header.tsx`

### 2순위: 동적 데이터 다국어화

- `shop` / `course` / `profile` 류 API 응답값
- backend error payload
- locale-aware labels from backend models

### 3순위: 최종 폴리싱

- `LanguageToggle` 위치와 스타일 정리
- 컴포넌트별 영어 유지 정책 검수
- QA 중 발견되는 줄바꿈/overflow 보정

---

## 새로 필요한 locale 파일

현재 필수 namespace는 이미 추가되었다.

현재 사용 중:
- `frontend/locales/en/auth.json`
- `frontend/locales/ko/auth.json`
- `frontend/locales/en/lessons.json`
- `frontend/locales/ko/lessons.json`
- `frontend/locales/en/ai-game.json`
- `frontend/locales/ko/ai-game.json`

후속 분리 후보:
- `frontend/locales/en/testimonials.json`
- `frontend/locales/ko/testimonials.json`
- `frontend/locales/en/navigation.json`
- `frontend/locales/ko/navigation.json`

---

## 작업 원칙

- 영어는 항상 기본값
- 한국어는 토글로만 전환
- 프론트는 `i18next` 기준으로 관리
- Django 템플릿 번역 JSON과 프론트 locale JSON은 분리된 자산으로 본다
- 같은 문구라도 프론트와 Django가 각각 다른 계층이면 각각의 리소스 파일에서 관리한다

---

## 프론트 기준 완료 조건

### 현재 완료
- `login`
- `signup`
- `lessons`
- `ai-game`
- `placeholder pages`
- `gamification` 잔여 aria/toast/demo 문구
- `leaderboard` 잔여 aria/modal/error 문구
- 랜딩 공통 컴포넌트의 후기/인트로/헤더 보조 문구

이 범위에서:
- 사용자 노출 문구가 번역 키를 사용하고
- 한국어 전환이 동작하며
- 영어 fallback이 깨지지 않아야 한다

### 후속 완료
- 공용 UI primitive의 접근성 문구 정리
- 콘텐츠성 영어 유지 기준 반영
- locale 파일 구조를 실제 화면 소유권 기준으로 재분리

---

## 현재 판단

이제 번역 작업의 중심은 Django 템플릿이 아니라 `frontend/`로 이동해야 한다.

인증과 학습 진입 화면은 프론트 기준으로 이미 번역 적용이 끝났고,
이제 남은 작업은 공용 UI 접근성 문구와 동적 데이터 다국어화로 좁혀진 상태다.

---

## 참고

- `document/week12/korean_translation_plan.md`
- `document/week12/korean_translation_inventory.md`
- `document/week12/development_merge_2026-05-22.md`
- `document/week12/translation_style_guide.md`
