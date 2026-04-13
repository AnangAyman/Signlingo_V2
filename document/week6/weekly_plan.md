# Week 6 — Migrate from Aiven MySQL to Oracle Cloud MySQL HeatWave

## 목표
현재 Aiven MySQL 기반 클라우드 DB 구성을 **Oracle Cloud MySQL HeatWave DB System (Always Free)** 으로 전환하고, Flask/SQLAlchemy 애플리케이션이 Oracle Cloud의 private MySQL DB에 안정적으로 연결되도록 설정한다.

> 기준 문서: `document/infra/Oracle Cloud MySQL Infrastructure.md`

---

## 최종 아키텍처

```text
Developer Local Machine
        ↓ SSH / Local Port Forwarding
Oracle Compute VM (Public IP)
        ↓ Private Network
Oracle MySQL HeatWave DB System (Private IP)
```

Oracle MySQL DB System은 public endpoint를 제공하지 않으므로, 외부 개발 환경에서는 Compute VM을 bastion-style host로 사용한다.

---

## 리소스 정보

### MySQL DB System

| Field | Value |
|------|-------|
| Name | Signlingo-DB |
| Type | MySQL HeatWave DB System |
| Shape | Always Free |
| Private IP | `10.0.1.50` |
| Port | `3306` |
| Admin User | `admin` |

### Compute VM

| Field | Value |
|------|-------|
| Name | signlingo-vm |
| OS | Ubuntu 22.04 |
| Shape | VM.Standard.E2.1.Micro |
| Public IP | `134.185.98.192` |
| Private IP | `10.0.1.93` |

### Network

| Resource | Value |
|------|-------|
| VCN | Signlingo |
| Public Subnet | public-subnet |
| Internet Gateway | igw-signlingo |

---

## 선택 근거

- Aiven Free Plan 용량 제한으로 인해 장기 테스트 및 팀원 데이터 저장에 부담 발생
- Oracle Cloud MySQL HeatWave Always Free 리소스를 활용하여 무료 DB 용량 확보
- 기존 Flask/SQLAlchemy 코드는 MySQL 계열 DB와 이미 호환되므로 `pymysql` 기반 설정을 유지 가능
- Google SSO 적용 전 User 모델과 인증 데이터를 안정적인 클라우드 DB에 정착시키는 것이 선행 조건

---

## 할 일

### 1. Oracle Cloud 접속 방식 확정
- [x] DB 종류 확정: Oracle Cloud MySQL HeatWave DB System
- [x] DB 접근 방식 확정: Compute VM을 통한 private network 접근
- [x] 로컬 개발 접근 방식 확정: SSH local port forwarding
- [ ] 팀원별 SSH public key 등록 및 접속 권한 확인
- [x] Oracle Cloud 인프라 문서 기준 DB/VM private network 구성 확인

### 2. VM 접속 확인
- [x] SSH key 권한 설정
  ```bash
  chmod 600 Oracle_DB/ssh-key-2026-04-10.key
  ```
- [x] Compute VM SSH 접속 확인
  ```bash
  ssh -i Oracle_DB/ssh-key-2026-04-10.key ubuntu@134.185.98.192
  ```
- [x] VM에 MySQL client 설치 여부 확인
  ```bash
  mysql --version
  ```
- [x] VM에 MySQL client 설치 완료 확인
  ```bash
  mysql  Ver 8.0.45-0ubuntu0.22.04.1 for Linux on x86_64 ((Ubuntu))
  ```

### 3. VM에서 DB 직접 접속 테스트
- [x] VM에서 Oracle MySQL DB private port 접근 확인
  ```text
  10.0.1.50:3306 mysql-port-open
  ```
- [x] VM 내부에서 Oracle MySQL DB 로그인 가능 상태 확인
  ```bash
  mysql -h 10.0.1.50 -u admin -p
  ```
- [x] 기본 DB 목록 확인
  ```sql
  SHOW DATABASES;
  ```
- [x] SignLingo용 database/schema 생성 여부 확인
  ```sql
  CREATE DATABASE IF NOT EXISTS signlingo;
  ```
- [ ] admin 비밀번호 분실 시 Oracle Console에서 Reset Administrator Password 수행

### 4. 로컬 포트 포워딩 설정
- [x] 로컬에서 SSH tunnel 실행
  ```bash
  ssh -L 3307:10.0.1.50:3306 -i Oracle_DB/ssh-key-2026-04-10.key ubuntu@134.185.98.192
  ```
- [x] 로컬 `127.0.0.1:3307` tunnel port 응답 확인
  ```text
  local-tunnel-ok
  ```
- [x] 로컬 MySQL client 또는 Python client에서 DB 로그인 확인
  ```bash
  mysql -h 127.0.0.1 -P 3307 -u admin -p
  ```
- [ ] DBeaver / MySQL Workbench / VSCode SQL Extension 접속 옵션 정리

### 5. 민감 파일 정리
- [x] Oracle DB 비밀번호는 `.env`로 분리하는 방향 확정
- [x] SSH key는 git 추적 제외
- [x] `.gitignore`에 Oracle 관련 민감 파일 추가
  ```gitignore
  Oracle_DB/
  *.key
  *.pem
  ```
- [x] `Oracle_DB/ssh-key-2026-04-10.key`가 git에 올라가지 않는지 확인
- [x] 팀원 공유 방식 정리
  - GitHub 업로드 금지
  - 직접 전달 또는 비밀 공유 도구 사용

### 6. Python 의존성 확인
- [x] Oracle MySQL HeatWave는 MySQL 계열이므로 `pymysql` 유지
- [x] `requirements.txt`에 MySQL 연결 패키지 포함 확인
  ```text
  pymysql==1.1.0
  cryptography==44.0.0
  python-dotenv==1.0.0
  ```
- [x] 로컬 `signlingo` conda 환경에서 import 테스트
  ```bash
  python -c "import pymysql; import cryptography; import dotenv"
  ```

### 7. .env DATABASE_URI 전환
- [x] SSH tunnel 사용 시 로컬 `.env` 예시 작성
  ```env
  DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@127.0.0.1:3307/signlingo
  ```
- [x] VM 내부에서 앱을 실행할 경우 `.env` 예시 작성
  ```env
  DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@10.0.1.50:3306/signlingo
  ```
- [x] 실제 `.env`의 기존 Aiven URI를 Oracle MySQL URI로 변경
- [ ] `.env`가 없을 때 SQLite fallback으로 로컬 실행 가능한지 확인

### 8. app.py DB 설정 확인
- [x] 기존 환경변수 구조 유지
  ```python
  app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///users.sqlite')
  ```
- [x] DB 초기화 명령이 어느 DB를 대상으로 실행되는지 명확히 확인
- [x] non-SQLite DB에서 `init-app` 실행 시 안전 가드 추가
- [x] `ALLOW_DB_RESET=1` 없이는 클라우드 DB 초기화가 중단되는지 확인
- [ ] DB 연결 실패 시 에러 메시지 확인

### 9. 마이그레이션 전략 결정
- [x] 개발 초기화 방식과 운영 유지 방식 분리

개발 초기화:
```bash
ALLOW_DB_RESET=1 flask --app app.py init-app
```

운영 마이그레이션:
```bash
flask --app app.py db upgrade
```

- [x] `init-app`이 `db.drop_all()`을 실행하므로 클라우드 DB에서 실수로 실행하지 않도록 주의 문서화
- [ ] Oracle MySQL 초기 세팅 시에만 `init-app` 실행할지 결정
- [ ] 기존 Aiven MySQL 데이터 백업 여부 결정
- [ ] 필요하면 Aiven → Oracle MySQL 데이터 이전 스크립트 작성

### 10. Oracle MySQL 연결 테스트
- [x] SSH tunnel을 켠 상태에서 Flask CLI 로딩 확인
  ```bash
  flask --app app.py run
  ```
- [x] SQLAlchemy engine 연결 확인
- [x] `flask --app app.py db upgrade` 실행 테스트
- [x] `flask --app app.py seed-data` 안전 시딩 명령 추가 및 실행 테스트
- [x] 초기 데이터 확인
  - 레슨 3개
  - Admin 계정
  - 상점 아이템 4개

### 11. 앱 기능 회귀 테스트
- [ ] 회원가입
- [x] 로그인
- [ ] 이메일 인증 실패 시 처리
- [x] 대시보드 리다이렉트 확인
- [ ] 퀴즈 플레이
- [ ] 생명 차감
- [ ] 레슨 상태 저장
- [ ] 리더보드 조회
- [ ] 상점 아이템 조회
- [ ] 서버 재시작 후 데이터 유지 확인

### 12. Docker 환경 반영
- [x] `docker-compose.yml`에 `.env` 연결
  ```yaml
  services:
    web:
      build: .
      ports:
        - "5001:5000"
      env_file:
        - .env
  ```
- [x] Docker에서 SSH tunnel 접근 방식 결정
  - 호스트에서 tunnel을 열고 컨테이너가 host gateway로 접근
- [x] `host.docker.internal:3307` 접근을 위해 `extra_hosts` 설정 추가
- [x] Dockerfile의 `RUN flask init-app` 위치 재검토
  - 빌드 단계에서 클라우드 DB를 초기화하는 구조는 위험
- [x] Dockerfile에서 `RUN flask init-app` 제거

---

## 예상 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `.env` | Oracle MySQL HeatWave 접속 URI로 변경 |
| `.gitignore` | `Oracle_DB/`, `*.key`, `*.pem` 제외 |
| `docker-compose.yml` | `.env` 연동 및 Docker DB 접근 방식 반영 |
| `Dockerfile` | 빌드 중 `flask init-app` 제거 |
| `app.py` | DB 환경변수 설정 유지, `init-app` 안전장치 추가 |
| `README.md` | Oracle MySQL + conda `signlingo` 실행 방법 반영 |
| `.env.example` | Oracle MySQL tunnel용 환경변수 예시 추가 |
| `migrations/` | DB 스키마 변경 시 migration 적용 |

---

## 리스크

| 항목 | 위험 | 대응 |
|------|------|------|
| SSH tunnel 누락 | 로컬 앱에서 DB 접속 실패 | 앱 실행 전 tunnel 실행 절차 문서화 |
| VM 접속 실패 | DB 접근 불가 | Public IP, 22번 포트, SSH key 권한 확인 |
| DB private IP 접근 실패 | VM에서 DB 접속 불가 | 동일 VCN 여부와 3306 security rule 확인 |
| `init-app` | 클라우드 DB 데이터 삭제 위험 | 운영 DB에서는 `db upgrade` 우선 사용 |
| 민감 파일 | SSH key 또는 DB 비밀번호 유출 위험 | `.gitignore` 및 직접 공유 |
| Docker 네트워크 | 컨테이너에서 `127.0.0.1:3307` 접근 실패 | host gateway 또는 VM 배포 방식 결정 |

---

## 완료 기준

- [x] VM에서 Oracle MySQL private port 및 DB 로그인 경로 확인
- [x] 로컬 SSH tunnel로 `127.0.0.1:3307` 접속 성공
- [x] Flask CLI가 Oracle MySQL HeatWave 설정으로 정상 로드됨
- [x] DB 테이블 생성 또는 마이그레이션 성공
- [x] 초기 데이터 시딩 성공
- [ ] 회원가입 → 로그인 → 퀴즈 → 결과 저장 흐름 정상 동작
- [ ] 서버 재시작 후 Oracle MySQL에 데이터가 유지됨
- [x] Oracle 접속 정보와 SSH key가 git에 포함되지 않음

---

## 현재 진행 상태

### 완료

- [x] 작업 브랜치 생성: `feature/oracle-mysql-migration`
- [x] 1차 커밋 생성: `2634983 chore: prepare oracle mysql migration`
- [x] 2차 커밋 생성: `fbb566e fix: align oracle mysql schema with models`
- [x] Oracle Compute VM SSH 접속 확인
- [x] VM에서 Oracle MySQL private port 접근 확인
- [x] 로컬 SSH tunnel 포트 확인
- [x] Oracle MySQL admin password 확인 및 `.env` 전환
- [x] `signlingo` database 생성 또는 존재 확인
- [x] `user.is_verified` migration 적용
- [x] seed data 삽입
- [x] `seed-data` 명령 추가 및 idempotent 확인
- [x] `/`, `/login`, `/start` HTTP 200 확인
- [x] admin 로그인 시 `/dashboard` 302 redirect 확인
- [x] `signlingo` conda 환경에서 MySQL 관련 dependency import 확인
- [x] `docker compose config --quiet` 통과
- [x] `git diff --check` 통과
- [x] `app.py` 문법 검사 통과

### 남은 blocker

- [ ] 브라우저 기반 전체 기능 회귀 테스트
- [x] main 기반 브랜치 push (`feature/oracle-mysql-main`)
- [ ] PR 생성 및 리뷰 요청

---

## 다음 주차 연결

Week 7 Google SSO Integration에서 User 모델에 `google_id` 필드가 추가될 예정이므로, Week 6에서 Oracle MySQL HeatWave 연결과 migration 실행 흐름을 먼저 안정화한다.

---

*Week 6 계획 작성일: 2026-04-14*
*Follow-up 반영일: 2026-04-14*
*진행 상태 최신화: 2026-04-14*
*주요 작업: Oracle Cloud MySQL HeatWave 전환*
