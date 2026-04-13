# Week 6 — Oracle Cloud MySQL Migration 변경 내역

## 작업 브랜치

```text
feature/oracle-mysql-migration   # kotaiho 기반 작업/검증 기록
feature/oracle-mysql-main        # origin/main 기반 반영 브랜치 (push 완료)
```

---

## 완료된 작업 요약

- [x] Oracle Cloud MySQL HeatWave 인프라 문서 확인
- [x] Week 6 계획서를 Oracle MySQL HeatWave 기준으로 재작성
- [x] Week 7 Google SSO 계획서의 DB 전제를 Oracle MySQL HeatWave로 수정
- [x] Oracle SSH key와 credential 파일이 git에 포함되지 않도록 `.gitignore` 수정
- [x] Docker Compose에서 `.env`를 읽도록 설정
- [x] Docker 컨테이너가 host SSH tunnel에 접근할 수 있도록 `host.docker.internal` 설정
- [x] Docker build 중 `flask init-app` 실행 제거
- [x] `.env.example` 추가
- [x] `init-app` 안전 가드 추가
- [x] README 실행 방법을 Oracle MySQL + conda `signlingo` 환경 기준으로 수정
- [x] 팀원용 Oracle Cloud MySQL 배포/실행 가이드 작성
- [x] 1차 커밋 완료
- [x] `.env`를 Oracle MySQL tunnel 기준으로 전환
- [x] Oracle MySQL `signlingo` database 생성 또는 존재 확인
- [x] 기존 source ERD와 DB 스키마 비교
- [x] `user.is_verified` 누락 컬럼 migration 추가 및 적용
- [x] seed data 삽입 완료
- [x] `flask --app app.py seed-data` 명령 추가
- [x] 기본 HTTP 회귀 테스트 완료
- [x] 2차 커밋 완료

---

## 생성된 문서

### 1. `document/week6/weekly_plan.md`

Oracle Cloud MySQL HeatWave 전환 계획서.

주요 반영 내용:

- Oracle MySQL HeatWave DB System 사용
- Compute VM을 bastion-style host로 사용
- SSH local port forwarding 방식 사용
- DB private IP: `10.0.1.50`
- VM public IP: `134.185.98.192`
- 로컬 tunnel port: `3307`
- `.env`의 `DATABASE_URI` 전환 계획
- Docker 환경에서 host tunnel 접근 방식
- `init-app` 사용 위험 및 운영 주의사항

### 2. `document/week6/team_deployment_guide.md`

팀원에게 공유할 Oracle Cloud MySQL 실행/배포 가이드.

주요 반영 내용:

- 로컬 실행 순서
- Docker 실행 순서
- `.env` 예시
- SSH key 관리 원칙
- 팀원별 SSH key pair 권장
- 공유 금지 정보
- DB 계정 권한 정책
- 문제 해결 체크리스트

### 3. `document/week7/weekly_plan.md`

Google SSO 계획서에서 DB 관련 표현을 Oracle MySQL HeatWave 기준으로 수정.

변경 내용:

- Oracle DB → Oracle MySQL HeatWave로 명확화
- migration 실행 시 SSH tunnel 필요 조건 추가
- `google_id` 저장 위치를 Oracle MySQL HeatWave로 명시

---

## 코드 변경 내역

## 변경된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `.gitignore` | Oracle credential/key 파일 제외 |
| `.env.example` | Oracle MySQL tunnel 기반 환경변수 예시 추가 |
| `Dockerfile` | build 단계의 `flask init-app` 제거 |
| `docker-compose.yml` | `.env` 로드 및 `host.docker.internal` 설정 추가 |
| `app.py` | non-SQLite DB에서 `init-app` 실행 안전 가드 추가 |
| `app.py` | `seed-data` CLI 명령 추가 |
| `README.md` | Oracle MySQL + conda `signlingo` 기준 실행 방법으로 수정 |

---

## 1. `.gitignore` — Oracle credential 보호

추가된 항목:

```gitignore
Oracle_DB/
*.key
*.pem
```

목적:

- Oracle Compute VM SSH private key가 git에 올라가는 것 방지
- Oracle 관련 pem/key 파일 accidental commit 방지

확인 결과:

- 기존에 untracked로 보이던 `Oracle_DB/`가 git status에서 사라짐

---

## 2. `.env.example` — 환경변수 템플릿 추가

추가된 예시:

```env
SECRET_KEY=change-me
DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@127.0.0.1:3307/signlingo

MAIL_USERNAME=signlingolanguage@gmail.com
MAIL_PASSWORD=change-me
```

Docker Compose용 안내도 함께 추가:

```env
DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@host.docker.internal:3307/signlingo
```

주의:

- 로컬 conda 실행: `127.0.0.1:3307`
- Docker 실행: `host.docker.internal:3307`

---

## 3. `Dockerfile` — build 중 DB 초기화 제거

제거된 코드:

```dockerfile
RUN flask init-app
```

제거 이유:

- `flask init-app`은 내부에서 `db.drop_all()`을 실행함
- Docker image build 중 클라우드 DB가 초기화될 위험이 있음
- DB 초기화는 빌드 단계가 아니라 담당자가 명시적으로 실행해야 함

---

## 4. `docker-compose.yml` — Oracle tunnel 접근 지원

추가된 설정:

```yaml
env_file:
  - .env
extra_hosts:
  - "host.docker.internal:host-gateway"
```

목적:

- Docker Compose가 `.env`의 `DATABASE_URI`를 읽도록 함
- 컨테이너 내부에서 호스트 PC의 SSH tunnel에 접근 가능하게 함

Docker 실행 시 `.env` 예시:

```env
DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@host.docker.internal:3307/signlingo
```

---

## 5. `app.py` — init-app 안전 가드 추가

추가된 동작:

- SQLite가 아닌 DB에서 `init-app` 실행 시 기본적으로 중단
- 의도적으로 초기화할 때만 `ALLOW_DB_RESET=1` 필요

사용 예:

```bash
ALLOW_DB_RESET=1 flask --app app.py init-app
```

가드 목적:

- Oracle MySQL 같은 클라우드 DB에서 실수로 전체 테이블을 삭제하는 것을 방지
- `init-app`이 위험한 명령이라는 점을 명확히 함

확인 결과:

```text
Error: Refusing to reset a non-SQLite database. Set ALLOW_DB_RESET=1 when you intentionally want to run init-app.
```

---

## 6. `README.md` — 실행 가이드 수정

수정된 내용:

- Database 설명을 Oracle Cloud MySQL HeatWave 기준으로 변경
- 로컬 실행 환경을 conda `signlingo` 기준으로 변경
- SSH tunnel 실행 방법 추가
- `.env` 설정 예시 추가
- 기존에 존재하지 않던 `flask seed_lessons` 안내 제거
- `flask --app app.py init-app` / `flask --app app.py db upgrade` 기준으로 수정
- Docker 실행 시 `.env`와 `host.docker.internal` 사용 안내 추가

---

## 인프라 연결 확인 결과

### 1. Oracle Compute VM SSH 접속

실행:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new \
  -i Oracle_DB/ssh-key-2026-04-10.key ubuntu@134.185.98.192 'echo vm-ok'
```

결과:

```text
vm-ok
```

### 2. VM 내부 MySQL client 확인

실행:

```bash
mysql --version
```

결과:

```text
mysql  Ver 8.0.45-0ubuntu0.22.04.1 for Linux on x86_64 ((Ubuntu))
```

### 3. VM에서 DB private port 접근 확인

대상:

```text
10.0.1.50:3306
```

결과:

```text
mysql-port-open
```

### 4. 로컬 SSH tunnel 확인

실행:

```bash
ssh -N -L 3307:10.0.1.50:3306 \
  -i Oracle_DB/ssh-key-2026-04-10.key ubuntu@134.185.98.192
```

로컬 포트 확인 결과:

```text
local-tunnel-ok
```

---

## 로컬 환경 확인 결과

### conda 환경

프로젝트 실행 기본 환경:

```text
signlingo
```

### Python 의존성 확인

실행:

```bash
conda run -n signlingo python -c "import pymysql, cryptography, dotenv"
```

결과:

```text
oracle-mysql-deps-ok
```

### Flask CLI 확인

실행:

```bash
conda run -n signlingo flask --app app.py --help
```

결과:

- Flask CLI 정상 로드
- `db`, `init-app`, `routes`, `run`, `shell` 명령 확인

참고:

- TensorFlow / CUDA 관련 경고 출력됨
- matplotlib cache directory 경고 출력됨
- 앱 로딩 자체에는 영향 없음

---

## 검증 명령

```bash
conda run -n signlingo python -m py_compile app.py
conda run -n signlingo python -c "import pymysql, cryptography, dotenv"
docker compose config --quiet
git diff --check
```

결과:

- [x] `app.py` 문법 검사 통과
- [x] Oracle MySQL 관련 Python dependency import 성공
- [x] Docker Compose 설정 검증 통과
- [x] diff whitespace 검사 통과
- [x] `init-app` safety guard 동작 확인

---

## 커밋 내역

```text
2634983 chore: prepare oracle mysql migration
fbb566e fix: align oracle mysql schema with models
207ba82 docs: explain oracle ssh access setup
1993bff chore: configure oracle mysql access
```

1차 커밋에 포함된 파일:

```text
.env.example
.gitignore
Dockerfile
README.md
app.py
docker-compose.yml
```

2차 커밋에 포함된 파일:

```text
README.md
app.py
migrations/versions/91b8f2d4c6a1_add_user_is_verified.py
```

커밋에 포함하지 않은 파일:

```text
routes.py
.codex
document/
Oracle_DB/
```

이유:

- `routes.py`: Oracle migration 작업 범위 밖의 기존 인증 수정
- `.codex`: 로컬 작업 파일
- `document/`: `.gitignore` 대상 로컬 문서
- `Oracle_DB/`: SSH private key 포함 가능성이 있어 git 제외

---

## 현재 남은 작업

### 1. `.env` Oracle URI 전환

완료.

현재 확인된 값:

```text
scheme: mysql+pymysql
host: 127.0.0.1
port: 3307
database: signlingo
```

로컬 SSH tunnel 기준:

```env
DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@127.0.0.1:3307/signlingo
```

또는 Docker 실행 시:

```env
DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@host.docker.internal:3307/signlingo
```

### 2. Oracle MySQL 실제 로그인 테스트

완료.

확인 결과:

```text
mysql_version: 9.6.1-cloud
database: signlingo
database_exists: True
```

### 3. `signlingo` database 생성 확인

완료.

```text
database: signlingo
tables: 10
```

### 4. Flask DB 연결 테스트

완료.

```bash
conda activate signlingo
flask --app app.py db upgrade
```

적용된 migration:

```text
44087e15056f -> 91b8f2d4c6a1
Add user is_verified column
```

### 5. Seed data 삽입

완료.

현재 row count:

```text
course 1
module 1
unit 1
lesson 3
user 1
shop_item 4
alembic_version 1
```

### 6. 앱 기능 회귀 테스트

부분 완료.

확인 결과:

```text
GET /      -> 200 OK
GET /login -> 200 OK
GET /start -> 200 OK
POST /login admin@example.com/admin -> 302 /dashboard
```

남은 확인:

- [ ] 회원가입
- [ ] 대시보드 접속
- [ ] 퀴즈 플레이
- [ ] 결과 저장
- [ ] 서버 재시작 후 데이터 유지 확인

---

## 다음 단계

1. 브라우저 기반 전체 기능 회귀 테스트
2. PR 생성 및 리뷰 요청

---

*작성일: 2026-04-14*
*대상 브랜치: feature/oracle-mysql-main*
*주요 작업: Oracle Cloud MySQL HeatWave migration 준비*
