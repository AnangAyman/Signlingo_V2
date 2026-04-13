# Week 5 — 코드 변경 내역

## 변경된 파일 (4개)

### 1. `app.py` — 환경변수 기반 설정으로 전환

**추가된 코드:**
```python
from dotenv import load_dotenv

load_dotenv()
```

**변경된 코드:**

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| DB URI | `'sqlite:///users.sqlite'` | `os.environ.get('DATABASE_URI', 'sqlite:///users.sqlite')` |
| SECRET_KEY | `<HARDCODED_SECRET_KEY>` | `os.environ.get('SECRET_KEY', '<DEV_FALLBACK>')` |
| MAIL_USERNAME | `'signlingolanguage@gmail.com'` | `os.environ.get('MAIL_USERNAME', 'signlingolanguage@gmail.com')` |
| MAIL_PASSWORD | `<HARDCODED_GMAIL_APP_PASSWORD>` | `os.environ.get('MAIL_PASSWORD', '<DEV_FALLBACK>')` |

> 주의: 문서 공유를 위해 실제 시크릿 값은 기록하지 않는다.

---

### 2. `requirements.txt` — MySQL 관련 패키지 3개 추가

```
pymysql==1.1.0           # MySQL 드라이버 (SQLAlchemy 연결용)
cryptography==44.0.0     # Aiven SSL 연결에 필요
python-dotenv==1.0.0     # .env 파일 로드
```

---

### 3. `.gitignore` — 민감 파일 제외

추가된 항목:
```
.env              # DB 접속 정보, 시크릿 키 등
ca.pem            # Aiven SSL 인증서

#local files
document.md       # 프로젝트 분석 문서
excute.md
```

---

## 새로 생성된 파일 (git에 포함되지 않는 로컬 파일)

| 파일 | 용도 |
|------|------|
| `.env` | 환경변수 (DATABASE_URI, SECRET_KEY, MAIL 정보) |
| `ca.pem` | Aiven MySQL SSL 인증서 |
| `document/` | 프로젝트 문서 디렉토리 (현재는 민감정보 제거 후 레포에 포함) |
| `document.md` | 프로젝트 전체 분석 문서 |

---

### 4. `routes.py` — 회원가입 후 미인증 세션 저장 버그 수정

**버그**: 회원가입 직후 `session['user']`, `session['user_id']`를 설정하여 이메일 인증 없이도 서비스 이용 가능했음. 서버 재시작 후 세션이 사라지면 로그인 시 `is_verified` 체크에 걸려 로그인 불가.

**변경 내용:**
- 회원가입 후 세션에 로그인 상태 저장하던 코드 제거 (`session['user']`, `session['user_id']` 삭제)
- 리다이렉트 대상을 `/start` → `/login`으로 변경
- flash 메시지에 인증 후 로그인하라는 안내 추가

**변경 전 (routes.py:88~106):**
```python
db.session.commit()
session['user'] = new_user.email       # 인증 없이 세션 저장
session['user_id'] = new_user.id       # 인증 없이 세션 저장
...
return redirect(url_for('auth.start'))  # start 페이지로 이동
```

**변경 후:**
```python
db.session.commit()
# 세션 저장 제거 — 인증 완료 후 로그인해야 함
...
return redirect(url_for('auth.login'))  # 로그인 페이지로 이동
```

---

## 요약

- 기존 코드 동작에는 영향 없음 (`.env` 없으면 기존 하드코딩 값으로 fallback)
- `.env` + `ca.pem`이 있으면 Aiven 클라우드 MySQL에 연결
- 없으면 기존 SQLite로 동작

---

*작성일: 2026-04-03*
