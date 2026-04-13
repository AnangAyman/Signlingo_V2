# Week 6 — Team Deployment Guide for Oracle Cloud MySQL

## 목표
팀원이 SignLingo를 실행할 때 **Oracle Cloud MySQL HeatWave DB**에 안전하게 연결할 수 있도록 실행 절차와 주의사항을 정리한다.

---

## 전체 구조

```text
Developer Local Machine
        ↓ SSH Tunnel
Oracle Compute VM
        ↓ Private Network
Oracle MySQL HeatWave DB System
```

Oracle MySQL DB System은 public IP가 없기 때문에 로컬 PC에서 바로 접속할 수 없다.  
반드시 Oracle Compute VM을 통해 SSH tunnel을 열고, 앱은 로컬 tunnel 포트로 DB에 접속한다.

---

## 팀원에게 공유할 것

### 공유 필요

| 항목 | 설명 |
|------|------|
| VM Public IP | `134.185.98.192` |
| DB Private IP | `10.0.1.50` |
| DB Port | `3306` |
| Local Tunnel Port | `3307` |
| DB Name | `signlingo` |
| DB User | 팀원용 별도 계정 권장 |
| `.env.example` | 환경변수 템플릿 |

### 공유 금지

| 항목 | 이유 |
|------|------|
| GitHub에 SSH private key 업로드 | VM 접속 권한 노출 |
| GitHub에 `.env` 업로드 | DB 비밀번호, 메일 비밀번호 노출 |
| GitHub에 DB admin password 업로드 | 전체 DB 제어 권한 노출 |
| 공용 채팅방에 key/password 평문 공유 | 유출 시 추적 및 회수 어려움 |

---

## SSH Key 관리 원칙

### 권장 방식

SSH private key는 프로젝트 폴더 밖에 저장한다.

```bash
mkdir -p ~/.ssh/signlingo
mv Oracle_DB/ssh-key-2026-04-10.key ~/.ssh/signlingo/oracle-signlingo.key
chmod 600 ~/.ssh/signlingo/oracle-signlingo.key
```

이후 SSH tunnel 명령에서는 repo 내부 경로가 아니라 `~/.ssh/signlingo/oracle-signlingo.key`를 사용한다.

```bash
ssh -L 3307:10.0.1.50:3306 -i ~/.ssh/signlingo/oracle-signlingo.key ubuntu@134.185.98.192
```

### 팀원별 권장 방식

- 한 개의 private key를 모두가 공유하지 않는 것이 원칙
- 팀원별 SSH key pair를 생성
- 각 팀원의 public key만 VM의 `~/.ssh/authorized_keys`에 추가
- 권한 회수가 필요하면 해당 팀원의 public key만 제거

---

## 로컬 실행 방법

### 1. 저장소 최신화

```bash
git pull
```

### 2. conda 환경 활성화

```bash
conda activate signlingo
```

### 3. 의존성 확인

```bash
python -c "import pymysql; import cryptography; import dotenv"
```

오류가 나면:

```bash
pip install -r requirements.txt
```

### 4. SSH Tunnel 실행

아래 명령을 실행한 터미널은 닫지 않는다.

```bash
ssh -L 3307:10.0.1.50:3306 -i ~/.ssh/signlingo/oracle-signlingo.key ubuntu@134.185.98.192
```

성공하면 별도 출력 없이 접속 상태가 유지된다.

### 5. .env 설정

프로젝트 루트에 `.env` 파일을 만든다.

```env
SECRET_KEY=팀에서_정한_SECRET_KEY
DATABASE_URI=mysql+pymysql://DB_USER:DB_PASSWORD@127.0.0.1:3307/signlingo

MAIL_USERNAME=signlingolanguage@gmail.com
MAIL_PASSWORD=메일_앱_비밀번호
```

주의:

- `.env`는 git에 올리지 않는다.
- DB 계정은 가능하면 `admin`이 아니라 팀원용 별도 계정을 사용한다.
- 비밀번호에 특수문자가 있으면 URL encoding이 필요할 수 있다.

### 6. DB 마이그레이션

기존 DB를 유지할 때:

```bash
flask --app app.py db upgrade
```

처음 세팅이어서 DB를 초기화해도 되는 경우에만:

```bash
ALLOW_DB_RESET=1 flask --app app.py init-app
```

주의:

- `init-app`은 내부에서 `db.drop_all()`을 실행한다.
- Oracle Cloud DB에서 실행하면 기존 데이터가 삭제된다.
- 팀원은 임의로 `init-app`을 실행하지 않는 것을 원칙으로 한다.

### 7. Flask 앱 실행

```bash
flask --app app.py run
```

접속:

```text
http://127.0.0.1:5000
```

---

## Docker 실행 방법

### 1. SSH Tunnel 실행

호스트 PC에서 먼저 tunnel을 연다.

```bash
ssh -L 3307:10.0.1.50:3306 -i ~/.ssh/signlingo/oracle-signlingo.key ubuntu@134.185.98.192
```

### 2. Docker용 .env 설정

Docker 컨테이너 안에서 `127.0.0.1`은 컨테이너 자신을 의미한다.  
따라서 Docker Compose 실행 시에는 `host.docker.internal`을 사용한다.

```env
DATABASE_URI=mysql+pymysql://DB_USER:DB_PASSWORD@host.docker.internal:3307/signlingo
```

### 3. Docker Compose 실행

```bash
docker compose up --build
```

접속:

```text
http://localhost:5001
```

---

## 권장 DB 계정 정책

### Admin 계정

- DB 초기 설정, migration, 장애 대응용
- 담당자만 사용
- 평소 앱 개발용으로 사용하지 않음

### 팀원 개발 계정

가능하면 팀원용 계정을 별도로 만든다.

```sql
CREATE USER 'signlingo_dev'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON signlingo.* TO 'signlingo_dev'@'%';
FLUSH PRIVILEGES;
```

권장:

- `DROP`, `GRANT`, global 권한은 주지 않음
- migration 담당자만 schema 변경 권한 사용
- 일반 기능 개발자는 필요한 권한만 사용

---

## 문제 해결

### SSH 접속이 안 됨

확인:

- VM public IP가 `134.185.98.192`인지 확인
- SSH key 경로가 맞는지 확인
- key 권한이 `600`인지 확인
- Oracle Console에서 VM이 실행 중인지 확인
- 22번 포트가 열려 있는지 확인

```bash
chmod 600 ~/.ssh/signlingo/oracle-signlingo.key
```

### DB 접속이 안 됨

확인:

- SSH tunnel 터미널이 열려 있는지 확인
- `.env`의 host/port 확인
  - 로컬 실행: `127.0.0.1:3307`
  - Docker 실행: `host.docker.internal:3307`
- DB user/password 확인
- VM에서 DB private IP `10.0.1.50:3306` 접근 가능한지 확인

### Flask 실행 시 init-app이 막힘

정상 동작이다.  
Oracle MySQL 같은 non-SQLite DB에서는 실수로 DB를 초기화하지 않도록 `ALLOW_DB_RESET=1`이 필요하다.

```bash
ALLOW_DB_RESET=1 flask --app app.py init-app
```

이 명령은 기존 데이터를 삭제할 수 있으므로 담당자만 실행한다.

---

## 팀원에게 전달할 요약

```text
1. conda activate signlingo
2. SSH tunnel 실행
3. .env의 DATABASE_URI를 127.0.0.1:3307 기준으로 설정
4. flask --app app.py db upgrade
5. flask --app app.py run
```

Docker 사용자는 `.env`의 DB host를 `host.docker.internal`로 설정한다.

---

*작성일: 2026-04-14*
*대상: SignLingo Oracle Cloud MySQL HeatWave 팀원 실행/배포 가이드*
