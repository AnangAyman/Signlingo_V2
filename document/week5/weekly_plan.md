# Week 5 — Set up the live cloud database (MySQL on Aiven)

## 목표
현재 SQLite(`sqlite:///users.sqlite`) 기반 로컬 DB를 **Aiven 무료 MySQL**로 전환

---

## 선택 근거
- **Aiven Free Plan**: 완전 무료 MySQL 1개 (과금 없음)
- 학기 프로젝트에 충분한 스펙
- 추후 다른 클라우드로 이전 시 `.env`의 `DATABASE_URI`만 변경하면 됨

---

## 할 일

### 1. Aiven MySQL 인스턴스 생성
- [x] https://aiven.io 가입
- [x] Console → Create Service → **MySQL** 선택
- [x] Plan: **Free** 선택
- [x] Cloud/Region: **Asia South Pacific** (Free Plan은 리전 세부 선택 불가)
- [x] Project: `skku-sign-lingo` / Service: `mysql-signlingo`
- [x] 생성 완료 후 Overview 탭에서 접속 정보 확인:
  - Host, Port, User, Password, Database name
  - **SSL 인증서** (CA cert) 다운로드 — Aiven은 SSL 필수

### 2. 프로젝트 의존성 추가
- [x] `requirements.txt`에 추가
  ```
  pymysql==1.1.0
  cryptography==44.0.0
  python-dotenv==1.0.0
  ```
  > `cryptography`는 Aiven SSL 연결에 필요

### 3. 환경변수 설정
- [x] 프로젝트 루트에 `.env` 파일 생성
- [x] Aiven에서 다운로드한 `ca.pem`을 프로젝트 루트에 저장
- [x] `.gitignore`에 `.env`, `ca.pem` 추가

### 4. app.py 수정
- [x] `dotenv` 로드 및 DB URI를 환경변수에서 읽도록 변경

### 5. 연결 테스트
- [x] conda signlingo 환경에서 pymysql 직접 연결 확인 (MySQL 8.0.45)

### 6. 모델 호환성 확인
- [x] `models.py` 검토 — SQLite 전용 문법 없는지 확인
  - `db.String` 길이 명시 확인 (MySQL은 길이 필수)
  - `db.Text` 타입 호환 확인
  - `datetime` 기본값 호환 확인
- [x] `friendship` 다대다 테이블 정상 생성 확인

### 7. 마이그레이션 실행
- [x] `flask init-app`으로 클라우드 DB에 테이블 생성 완료 (MySQL 8.0.45)

### 8. 초기 데이터 시딩
- [x] `flask init-app` 실행하여 클라우드 DB에 시드 데이터 삽입 완료
  - 레슨 3개 (Learn with Video, Quiz Challenge, Show Your Signs)
  - Admin 계정
  - 상점 아이템 4개

### 9. 앱 구동 테스트
- [x] 로컬에서 클라우드 MySQL 연결하여 앱 정상 구동 확인 (HTTP 200)
- [x] 회원가입 → 로그인 → 퀴즈 플레이 흐름 테스트 완료
  - Admin: 레슨 3개 완료, points=10090
  - kotaiho: 레슨 3개 완료, points=90, lives=4
  - 서버 종료 후에도 클라우드 DB에 데이터 유지 확인
- [ ] Docker 환경에서도 정상 작동 확인 (`docker-compose.yml`에 환경변수 전달)

### 10. Docker 설정 업데이트
- [ ] `docker-compose.yml`에 `.env` 연동
  ```yaml
  services:
    web:
      build: .
      ports:
        - "5001:5000"
      env_file:
        - .env
  ```
- [ ] Dockerfile에서 `flask init-app` 빌드 단계 검토 (클라우드 DB 접근 가능한 시점에서 실행되어야 함)

---

## 남은 작업
- [ ] Docker 환경 `.env` 연동 테스트
- [ ] 팀원에게 `.env` + `ca.pem` 파일 공유 (직접 전달, git 제외)

---

## 참고 — 현재 DB 관련 코드 위치

| 파일 | 내용 |
|------|------|
| `app.py:12` | `SQLALCHEMY_DATABASE_URI` 설정 (환경변수에서 로드) |
| `.env` | DB 접속 정보, 시크릿 키, 메일 정보 (git 제외) |
| `ca.pem` | Aiven SSL 인증서 (git 제외) |
| `models.py` | 전체 모델 정의 (User, Course, Module, Unit, Lesson, ShopItem 등) |
| `initialization.py` | DB 시딩 함수 3개 |
| `migrations/` | Alembic 마이그레이션 스크립트 5개 |

---

## Aiven 무료 플랜 제한 사항

| 항목 | 제한 |
|------|------|
| 스토리지 | 1 GB |
| 백업 | 1일치 |
| 노드 | 1개 (HA 없음) |
| 리전 | 일부 리전만 지원 |
| 동시 연결 | 제한 있음 (학기 프로젝트에는 충분) |

> 용량이나 성능이 부족해지면 `.env`의 `DATABASE_URI`만 바꿔서 Railway/Cloud SQL 등으로 즉시 이전 가능

---

## 실행 환경
- **conda 환경**: `signlingo`
- **활성화**: `conda activate signlingo`

---

*Week 5 계획 작성일: 2026-04-03*
*클라우드 DB: Aiven MySQL Free Plan*
