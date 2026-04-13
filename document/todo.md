# kotaiho 담당 작업 목록

## 명시적 담당

### 1. Database
- [ ] 비밀번호 평문 저장 → bcrypt/werkzeug 해싱으로 전환
- [ ] `reset_tokens`가 메모리 dict에 저장 → DB 테이블로 이전 (만료 시간 포함)
- [x] SQLite → Cloud DB 전환 (Aiven MySQL Free Plan 완료)
- [ ] Aiven MySQL → Oracle Cloud MySQL HeatWave 전환
  - [x] Oracle Cloud MySQL HeatWave 인프라 문서 확인
  - [x] Compute VM 경유 SSH tunnel 방식 확정
  - [x] VM SSH 접속 확인
  - [x] VM에서 DB private port(`10.0.1.50:3306`) 접근 확인
  - [x] 로컬 tunnel port(`127.0.0.1:3307`) 접근 확인
  - [x] Docker build 중 `flask init-app` 제거
  - [x] non-SQLite DB에서 `init-app` 안전 가드 추가 (`ALLOW_DB_RESET=1` 필요)
  - [x] `.env.example` 추가
  - [x] Oracle MySQL admin password 확인
  - [x] `.env`의 `DATABASE_URI`를 Oracle MySQL tunnel 기준으로 변경
  - [x] Oracle MySQL 실제 로그인 테스트
  - [x] `signlingo` database 생성 또는 존재 확인
  - [x] Flask migration 및 초기 시딩 실행
  - [x] 기존 source ERD 기준 `user.is_verified` 누락 컬럼 보정
  - [x] `seed-data` CLI 명령 추가
  - [x] 기본 HTTP 회귀 테스트 (`/`, `/login`, `/start`, admin login redirect)
  - [x] VSCode에서 SQLTools로 테이블/row 시각화 확인
  - [ ] 브라우저 기반 전체 기능 회귀 테스트 (학습/상점/리더보드/회원가입/비번재설정 포함)
  - [x] main 기반 반영 브랜치 push 완료: `feature/oracle-mysql-main`
  - [ ] `feature/oracle-mysql-main` → `main` PR 생성 및 리뷰 요청
  - [ ] PR merge 이후 브랜치 정리
  - [ ] (선택) 브랜치 네이밍을 `feature/oracle-mysql-migration`으로 맞출지 팀과 합의
- [ ] DB 스키마 정리 및 인덱스 최적화
- [ ] User 삭제 시 관련 데이터 자동 삭제 (cascade 설정)
  - UserLessonStatus, UserItem, friendship 등 연관 테이블
- [x] `SECRET_KEY`, 메일 비밀번호 등 하드코딩된 시크릿 → 환경변수 분리 (`.env` + `python-dotenv`)
- [ ] 회원가입 시 이메일 인증 메일 발송 실패 문제 해결 (Gmail 앱 비밀번호 만료)
- [ ] Docker 환경에서 Oracle MySQL 연동 테스트
- [x] 팀원용 Oracle Cloud MySQL 실행/배포 가이드 작성
- [ ] 팀원에게 DB 접속 방법 공유(문서 링크 + 필요한 값만 전달)
  - `.env`, SSH private key는 GitHub 업로드 금지
  - 가능하면 팀원별 SSH key pair 사용
  - `ca.pem`은 Aiven용이므로 Oracle MySQL HeatWave 전환 후 공유 대상에서 제외

### 1-1. Git / Release (Oracle 전환 작업)
- [ ] `origin/main` 최신 상태 재확인 후 PR 생성 (충돌 가능성 체크)
- [ ] PR merge 완료 후 로컬/원격 브랜치 정리
  - 로컬 `kotaiho` 브랜치는 삭제해도 됨 (원격 `origin/kotaiho`는 나중에 확인 후 삭제)
- [ ] repo 루트에 생긴 untracked `.codex` 처리 (삭제 or `.gitignore` 추가)

### 2. Google Integration
- [ ] Google OAuth 2.0 로그인 연동
  - Oracle MySQL 전환 완료 후 별도 브랜치에서 진행
  - 권장 브랜치: `feature/google-sso-integration`
  - 현재 Flask 기준: Authlib 사용
  - Django 전환 시: django-allauth로 교체 검토
- [ ] Google 계정 연동 시 User 모델에 `google_id` 필드 추가
- [ ] 기존 이메일/패스워드 계정과 Google 계정 연결(linking) 로직
- [ ] Google 로그인 시 이메일 자동 인증 처리 (`is_verified=True`)

---

## 추가 담당 예정

### 3. Shop Rewire & Leaderboard DB
- [ ] 상점 구매 라우트 구현 (`/shop/buy/<item_key>`)
  - 포인트 차감, UserItem 수량 증가
- [ ] 아이템 사용 라우트 구현 (`/shop/use/<item_key>`)
  - Refill Hearts: `user.lives = 5`
  - Streak Freeze: 스트릭 보호 플래그 추가
  - XP Boost: 임시 2배 포인트 세션/DB 플래그
  - Timer Freeze: 클라이언트 연동 필요
- [ ] 상점 페이지(`/shop`) GET 라우트 구현 (아이템 목록 + 유저 인벤토리)
- [ ] 리더보드 DB 쿼리 최적화 (현재 전체 유저 Python sort → DB ORDER BY + LIMIT)
- [ ] 주간/월간 리더보드 리셋 로직 검토
- [ ] ShopItem에 카테고리, 최대 보유량 등 필드 추가 검토

### 4. SSO API & State Sync Endpoints
- [ ] SSO(Single Sign-On) API 설계
  - Google OAuth (위 Google Integration과 통합)
  - 추가 제공자 확장 가능 구조 (Apple, GitHub 등)
- [ ] JWT 또는 세션 기반 인증 토큰 발급 API
- [ ] State Sync 엔드포인트 설계 및 구현
  - `GET /api/sync/state` — 유저의 전체 학습 상태 반환
  - `POST /api/sync/state` — 클라이언트 학습 상태 동기화
- [ ] 멀티 디바이스 간 진행 상태 충돌 해결 정책 수립 (last-write-wins 등)
- [ ] API 인증 미들웨어 구현 (토큰 검증)

### 5. Cloud DB & Legacy Migration to Django
- [x] Cloud DB 선택 및 세팅 (Aiven MySQL Free Plan 완료)
- [ ] Cloud DB 재선정 및 전환 (Oracle Cloud MySQL HeatWave)
- [ ] SQLAlchemy → Django ORM 모델 재작성
  - User, Course, Module, Unit, Lesson, UserLessonStatus
  - ShopItem, UserItem, friendship 테이블
- [ ] Flask → Django 전환 계획 수립
  - routes.py Blueprint → Django views/urls 매핑
  - Jinja2 템플릿 → Django 템플릿 전환
  - Flask-Mail → Django 이메일 백엔드
  - Flask-Migrate → Django migrations
- [ ] 기존 SQLite/Aiven 데이터 → Oracle MySQL 마이그레이션 스크립트 작성
- [ ] Django settings에 환경별 DB 설정 (dev/staging/prod)
- [ ] 기존 세션 기반 인증 → Django Auth 시스템 전환

### 6. Dataset Feature Extractor
- [ ] MediaPipe 손 랜드마크 추출 파이프라인 정리
- [ ] 현재 학습 데이터셋 분석 (Training_the_model.ipynb 기반)
- [ ] Feature extraction 스크립트 독립 모듈화 (`feature_extractor.py`)
  - 입력: 이미지/비디오 프레임
  - 출력: 정규화된 랜드마크 좌표 벡터
- [ ] 데이터 증강(augmentation) 파이프라인 추가 검토
- [ ] 추출된 feature 저장 포맷 결정 (CSV, NPZ, HDF5 등)
- [ ] 새로운 수어 데이터 추가 시 재학습 자동화 스크립트

---

## 작업 우선순위 (권장)

```
[높음] Oracle Cloud MySQL HeatWave 전환 마무리
  ↓
[높음] Google Integration (별도 브랜치에서 진행)
  ↓
[높음] Database 보안 (비밀번호 해싱, reset_tokens DB 이전)
  ↓
[중간] Shop Rewire & Leaderboard DB (기존 모델 활용, 비교적 빠름)
  ↓
[중간] SSO API & State Sync (Google 연동 완료 후 확장)
  ↓
[중간] Dataset Feature Extractor (ML 파이프라인 독립 모듈화)
  ↓
[낮음] Cloud DB & Django Migration (가장 큰 작업, 학기 후반부)
```

---

## 현재 코드베이스 참고 사항

- `models.py`: 모든 DB 모델 정의 위치
- `routes.py`: 모든 라우트 (~980줄, 단일 Blueprint `auth_bp`)
- `initialization.py`: DB 시딩 로직 (레슨, 어드민, 상점 아이템)
- `app.py`: Flask 앱 설정 (환경변수에서 로드, `.env` 사용)
- `document/week6/weekly_plan.md`: Oracle Cloud MySQL HeatWave 전환 계획
- `document/week6/changed.md`: Week 6 진행 내역
- `document/week6/team_deployment_guide.md`: 팀원용 Oracle MySQL 실행/배포 가이드
- `models/`: 학습된 .h5 모델 3개 (Best, EfficientNet, MobileNet)
- `Training_the_model.ipynb`: 모델 학습 코드

---

*작성일: 2026-04-03*
*최신화: 2026-04-14*
