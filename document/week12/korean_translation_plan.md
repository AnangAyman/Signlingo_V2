# Korean Translation Plan

## 목적
현재 영어 중심으로 된 UI와 문서 흐름을 한국어 병행 지원 구조로 바꾼다.

번역은 단순 문구 치환이 아니라, 화면별로 문맥을 유지하는 리소스 분리까지 포함한다.
영어는 항상 기본 언어로 유지하고, 한국어는 선택형 토글로만 제공한다.

---

## 적용 원칙

- 영어는 기본값이며 절대 제거하지 않는다.
- 한국어는 `EN / KO` 토글로만 전환 가능하게 한다.
- 언어 전환 전후에 영어 원문 의미가 유지되어야 한다.
- 사용자에게 노출되는 텍스트는 우선 번역 대상에 넣는다.
- 영어 유지가 필요한 문구는 별도 기준 문서에 따라 명시적으로 유지한다.
- 개발자 문서와 사용자 문구는 분리한다.
- 에러 메시지, 버튼 라벨, 안내 문구는 동일 용어를 유지한다.
- 화면별 번역 키를 고정해서 이후 Google/AI Hub 작업과 분리한다.

---

## 우선 번역 대상

### 1. 인증 화면
- 로그인
- 회원가입
- 비밀번호 재설정
- Google 로그인 안내문
- 이메일 인증 안내문

### 2. 학습 화면
- 레슨 제목
- 학습 설명
- 퀴즈 안내문
- 정답/오답 메시지
- 레슨 완료 메시지

### 3. 공통 UI
- 버튼 라벨
- 네비게이션 메뉴
- toast/flash 메시지
- 빈 상태 안내문

### 4. 오류 메시지
- 로그인 실패
- OAuth 실패
- DB 연결 실패
- 업로드 실패
- 학습 데이터 누락

---

## 구현 방식 검토

### 옵션 A: 코드 내 상수 분리
- 장점: 빠르게 적용 가능
- 단점: 문구가 많아지면 유지보수가 어려움

### 옵션 B: 언어별 리소스 파일 분리
- 장점: 한국어/영어를 한 구조로 관리 가능
- 단점: 초기 정리 작업이 필요함

### 권장
- 화면이 늘어날 가능성이 있으므로 리소스 파일 분리를 우선 검토한다.
- 영어를 기준 카탈로그로 두고, 한국어 리소스는 그 위에 대응시키는 구조가 적합하다.

---

## 작업 순서

1. 영어 문구 목록을 먼저 수집한다.
2. 영어를 기준 언어 카탈로그로 만든다.
3. 화면 단위로 번역 키를 만든다.
4. 한국어 번역문을 채운다.
5. 언어 토글 저장 방식(session 또는 cookie)을 정한다.
6. 화면별로 누락된 문구를 점검한다.
7. 실제 브라우저 화면에서 줄바꿈/레이아웃 깨짐을 확인한다.

---

## 언어 토글 정책

- 기본 진입 언어: 영어
- 사용자가 직접 토글할 때만 한국어로 변경
- 새 세션이나 비로그인 상태에서도 기본값은 영어 유지
- 한국어 리소스가 없는 키는 영어 fallback 사용

---

## 결과 확인 방법

### 1. 기본값 확인
- 새 브라우저 세션에서 첫 진입 시 영어가 기본으로 보이는지 확인
- 로그인 전/후 모두 영어가 기본으로 유지되는지 확인

### 2. 토글 확인
- `EN -> KO` 전환 시 같은 화면에서 문구만 바뀌는지 확인
- `KO -> EN` 복귀 시 원문이 그대로 복원되는지 확인
- 페이지 이동 후에도 선택 언어가 유지되는지 확인

### 3. fallback 확인
- 한국어 번역이 없는 키는 영어가 깨지지 않고 그대로 노출되는지 확인
- 에러 메시지, flash 메시지, 버튼 라벨도 같은 규칙을 따르는지 확인

### 4. UI 검수
- 텍스트 길이 증가로 버튼, 카드, 제목이 깨지지 않는지 확인
- 모바일과 데스크톱 모두에서 줄바꿈이 과도하지 않은지 확인
- 토글 UI가 인증 화면과 대시보드에서 같은 위치/같은 동작을 유지하는지 확인

### 5. ML Game 검수
- `templates/ml_game.html` 상단 헤더는 DB lesson title이 아니라 번역 키를 기준으로 표시되는지 확인
- 영어에서는 `Show Your Signs`, 한국어에서는 `수화를 보여주세요`가 표시되는지 확인
- 문제 프롬프트는 API 응답 기준으로 영어 `Show Bisindo Letter {letter}`, 한국어 `Bisindo 글자 {letter}를 표현해 보세요`로 바뀌는지 확인
- JS 런타임 문구(카메라 오류, 문제 로드 실패, 정답/오답 피드백, 완료 문구)가 현재 선택 언어와 일치하는지 확인

---

## 산출물

- `templates/` 또는 프론트 문구를 위한 번역 키 목록
- 영어 기준 언어 카탈로그
- 한국어 문구 대응표
- 누락 문구 체크리스트
- 영어 유지 대상 기준 문서

---

## 완료 기준

- 영어가 항상 기본 언어로 유지되어야 한다.
- 한국어는 토글로만 선택 가능해야 한다.
- 로그인/회원가입/학습 화면이 한국어로 표시 가능해야 한다.
- 주요 오류 메시지가 한국어로 출력되어야 한다.
- 번역 리소스가 코드와 분리되어 관리 가능해야 한다.

## 현재 구현 상태

- 번역 리소스는 JSON 파일 기준으로 분리되어 있다.
- 언어 상태는 세션 `ui_language`에 저장된다.
- 영어는 항상 기본값이고, 한국어는 `EN / KO` 토글로만 선택 가능하다.
- 주요 템플릿의 고정 UI 문구는 번역 리소스로 연결되어 있다.
- `ml_game`는 템플릿 문구뿐 아니라 JS 런타임 문구와 API 질문 프롬프트까지 번역 구조에 연결되어 있다.
- 동적 데이터 다국어화는 아직 구현 범위에 포함되지 않는다.
- `origin/development` 병합 이후 새 `frontend/`에도 별도 i18n 구조가 들어왔기 때문에, 이후 우선 번역 범위는 프론트 기준으로 다시 잡아야 한다.
- 프론트 기준 상세 범위는 `document/week12/frontend_translation_scope.md`에서 관리한다.
- 프론트 기준으로 `login`, `signup`, `lessons`, `ai-game`, `placeholder`, `gamification`, `leaderboard`, 랜딩 공통 컴포넌트의 고정 문구 번역은 반영된 상태다.
- 현재 남은 프론트 후속 범위는 공용 UI primitive 접근성 문구와 동적 데이터 다국어화다.
## Deferred: Dynamic Data Localization

- Current scope translates fixed template strings first.
- Dynamic data such as `shop_items` names/descriptions and future course catalog content remain source-language data for now.
- If multilingual dynamic data is implemented later, the backend should deliver locale-aware values or parallel language fields rather than hardcoding translations in templates.
- This is intentionally documented only for now and is not part of the current implementation batch.

## Deferred: Toggle Placement and Styling

- Current language toggle behavior works functionally across translated screens.
- Sidebar toggle placement and visual styling are intentionally not being refined further in the current backend-driven pass.
- Final position, spacing, and component shape should be aligned after the frontend update is available.
- Until then, implementation priority is translation coverage and stable language switching rather than final UI polish.
