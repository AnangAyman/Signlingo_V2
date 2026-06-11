# Frontend Translation Review Checklist — 2026-06-04

## 목적
프론트 번역 작업을 커밋 단위로 나눠 검토할 때 확인해야 할 항목을 고정한다.

이 문서는 다음 상황을 전제로 한다.
- 영어는 기본값으로 유지한다.
- 한국어는 `EN / KO` 토글로만 선택한다.
- 번역은 커밋 단위로 분리되어 있다.
- 나중에 `git show`, `git diff`, 브라우저 QA를 조합해 검토한다.

---

## 검토 대상 커밋

- `f5696c8 frontend i18n: translate login and signup pages`
- `023f8eb frontend i18n: translate lessons page`
- `9a35a40 frontend i18n: translate ai-game and placeholder pages`
- `e1eb17d frontend i18n: translate gamification components`
- `a53b4a0 frontend i18n: translate leaderboard components`
- `47fbde0 frontend i18n: translate common landing components`
- `f31ace9 frontend i18n: localize league data errors`
- `4eb61af docs: update frontend translation status`
- 2026-06-04 working tree batch: frontend i18n hardcoded string cleanup

---

## 공통 검수 기준

### 1. 언어 정책
- 기본 진입 언어가 영어인지 확인
- `EN / KO` 토글로만 한국어 전환이 가능한지 확인
- 번역 누락 시 영어 fallback이 유지되는지 확인

### 2. 키 구조
- 하드코딩 문자열이 번역 키로 치환되었는지 확인
- 새 namespace 추가가 필요한 곳에만 추가됐는지 확인
- 영어/한국어 JSON 키가 동일한 구조를 유지하는지 확인

### 3. UI 동작
- 토글 전환 후 화면이 다시 그려질 때 레이아웃이 깨지지 않는지 확인
- 버튼, 카드, 빈 상태, 에러 문구가 현재 언어와 일치하는지 확인
- 모바일/데스크톱 둘 다 토글이 유지되는지 확인

### 4. 접근성
- `aria-label`, `title`, 보조 텍스트가 현재 언어와 일치하는지 확인
- 화면 리더에 노출되는 문구가 영어 하드코딩으로 남지 않았는지 확인

### 5. 실패 경로
- API 실패 메시지, toast, retry 문구가 번역되는지 확인
- 에러가 났을 때 영문 하드코딩이 노출되지 않는지 확인

---

## 커밋별 검토 체크리스트

### `f5696c8` 인증 화면

대상:
- `frontend/app/login/page.tsx`
- `frontend/app/signup/page.tsx`
- `frontend/locales/en/auth.json`
- `frontend/locales/ko/auth.json`

확인:
- 로그인/회원가입 제목과 설명이 EN/KO 전환되는지
- 입력 placeholder, 버튼, divider 문구가 전환되는지
- 비밀번호 show/hide aria가 전환되는지
- 에러 문구가 한국어로 바뀌는지
- `Google`, `GitHub`, `SignLingo`는 의도적으로 영어 유지되는지

### `023f8eb` 레슨 화면

대상:
- `frontend/app/lessons/page.tsx`
- `frontend/locales/en/lessons.json`
- `frontend/locales/ko/lessons.json`

확인:
- 로딩 문구가 전환되는지
- 실패 문구가 전환되는지
- 빈 상태/안내 문구가 전환되는지
- 영어 fallback이 유지되는지

### `9a35a40` AI 게임 / placeholder

대상:
- `frontend/app/ai-game/page.tsx`
- `frontend/app/profile/page.tsx`
- `frontend/app/notifications/page.tsx`
- `frontend/app/settings/page.tsx`
- `frontend/locales/en/ai-game.json`
- `frontend/locales/ko/ai-game.json`
- `frontend/locales/en/placeholder.json`
- `frontend/locales/ko/placeholder.json`

확인:
- AI 게임 카드 제목/설명/버튼이 전환되는지
- placeholder 페이지 title/message/hint가 전환되는지
- 링크 동작과 번역이 서로 충돌하지 않는지

### `e1eb17d` 게임화 컴포넌트

대상:
- `frontend/components/gamification/*`
- `frontend/locales/en/gamification.json`
- `frontend/locales/ko/gamification.json`

확인:
- 배지 rarity, unlock 문구, earned 문구가 전환되는지
- rewards toast와 aria 문구가 전환되는지
- daily quests, progress aria, simulate 버튼 보조 문구가 전환되는지
- level-up modal 보조 문구가 전환되는지
- 배지/보상/일일 퀘스트의 이름/설명/조건이 데이터 객체가 아니라 locale key에서 표시되는지
- persisted Zustand state에 과거 문자열 필드가 남아 있어도 UI가 locale 값을 우선 사용하는지

### `a53b4a0` 리더보드 컴포넌트

대상:
- `frontend/components/leaderboard/*`
- `frontend/locales/en/leaderboard.json`
- `frontend/locales/ko/leaderboard.json`

확인:
- 검색 clear aria가 전환되는지
- row aria, online title, add friend 보조 문구가 전환되는지
- modal title, badges, practice helper, action buttons가 전환되는지
- loading/error/retry 문구가 현재 언어와 일치하는지
- 주간 날짜 표기가 언어별 locale에 맞는지

### `47fbde0` 랜딩 공통

대상:
- `frontend/components/app-header.tsx`
- `frontend/components/navbar.tsx`
- `frontend/components/hero-section.tsx`
- `frontend/components/testimonials-section.tsx`
- `frontend/app/page.tsx`
- `frontend/locales/en/common.json`
- `frontend/locales/ko/common.json`

확인:
- 앱 헤더의 navigation/notifications/settings/profile aria가 전환되는지
- 모바일 메뉴 토글 aria가 전환되는지
- hero social proof 문구가 전환되는지
- intro replay/skip 문구가 전환되는지
- testimonials 카드 콘텐츠, dot aria, stats label이 전환되는지

### `f31ace9` 리그 훅 에러

대상:
- `frontend/components/leagues/useLeagueData.ts`

확인:
- 리그 데이터 fetch 실패 시 에러가 locale 문자열을 쓰는지
- `frontend/components/leagues/LeagueTiers.tsx`에서 표시되는 실패 문구와 충돌하지 않는지

### 2026-06-04 하드코딩 문구 정리

대상:
- `frontend/app/login/page.tsx`
- `frontend/app/signup/page.tsx`
- `frontend/components/hero-section.tsx`
- `frontend/components/cta-section.tsx`
- `frontend/components/navbar.tsx`
- `frontend/components/footer.tsx`
- `frontend/components/welcome-character.tsx`
- `frontend/components/leagues-section.tsx`
- `frontend/components/leagues/*`
- `frontend/components/gamification/*`
- `frontend/mocks/gamificationData.ts`
- `frontend/locales/en/{auth,common,gamification,leagues}.json`
- `frontend/locales/ko/{auth,common,gamification,leagues}.json`

확인:
- login stats 라벨이 `auth.login.stats.*`에서 표시되는지
- 이미지 `alt`와 로고 `aria-label`이 `common.media.*` 또는 `auth.*.mascotAlt`에서 표시되는지
- landing league tooltip/CTA/badge/XP label이 `common.leagues.*`에서 표시되는지
- 리그 화면의 표시명이 `leagues.tiers.<tier>.name`에서 표시되는지
- 배지/보상/일일 퀘스트 표시 문구가 `gamification` namespace의 `items` 하위 키에서 표시되는지
- `frontend/components/ui/*` 내부 primitive 문구는 이번 배치 범위 밖으로 남아 있는지

### `4eb61af` 문서

대상:
- `document/week12/frontend_translation_scope.md`
- `document/week12/korean_translation_plan.md`
- `document/week12/korean_translation_inventory.md`

확인:
- 실제 구현 완료 범위와 문서 상태가 일치하는지
- 남은 후속 범위가 정확히 공용 UI 접근성 문구 / 동적 데이터 다국어화로 정리되어 있는지

---

## 검토 명령 예시

### 커밋별 코드 검토
```bash
git show f5696c8
git show 023f8eb
git show 9a35a40
git show e1eb17d
git show a53b4a0
git show 47fbde0
git show f31ace9
git show 4eb61af
```

### 묶음 검토
```bash
git diff b2514e6..HEAD -- frontend
git diff b2514e6..HEAD -- document/week12
```

### locale 키 구조 검증
```bash
node -e 'const fs=require("fs"),path=require("path");const base="frontend/locales";function flat(o,p="",a=[]){for(const [k,v] of Object.entries(o)){const q=p?p+"."+k:k;if(v&&typeof v==="object"&&!Array.isArray(v))flat(v,q,a);else a.push(q)}return a}let bad=false;for(const f of fs.readdirSync(path.join(base,"en")).filter(x=>x.endsWith(".json")).sort()){const en=flat(JSON.parse(fs.readFileSync(path.join(base,"en",f),"utf8"))).sort();const ko=flat(JSON.parse(fs.readFileSync(path.join(base,"ko",f),"utf8"))).sort();const es=new Set(en),ks=new Set(ko);const missingKo=en.filter(k=>!ks.has(k));const missingEn=ko.filter(k=>!es.has(k));if(missingKo.length||missingEn.length){bad=true;console.log(f); if(missingKo.length) console.log("  missing ko:",missingKo.join(", ")); if(missingEn.length) console.log("  missing en:",missingEn.join(", "));}}process.exit(bad?1:0)'
```

### 타입 검증
```bash
cd frontend
./node_modules/.bin/tsc --noEmit
```

### 브라우저 검수 페이지
```text
/login
/signup
/lessons
/ai-game
/dashboard
/leaderboard
/gamification
/
```

---

## 남은 후속 검토 범위

- `frontend/components/ui/*` 내부 공용 접근성 문구
- 동적 데이터 다국어화
- 토글 위치/스타일 최종 폴리싱
- backend-originated error payload locale 정책

---

## 참고 문서

- `document/week12/frontend_translation_scope.md`
- `document/week12/korean_translation_plan.md`
- `document/week12/korean_translation_inventory.md`
- `document/week12/translation_style_guide.md`
