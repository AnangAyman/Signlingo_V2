# 하드코딩된 민감 정보 목록 및 환경변수 전환 가이드

## 체크 포인트

이 문서는 팀 공유용이다. **실제 시크릿 값은 적지 않는다.**

## (과거) 코드에 존재하던 하드코딩 시크릿

| # | 항목 | (과거) 값 예시 | 위치 | 위험도 |
|---|------|---------|------|--------|
| 1 | `SECRET_KEY` | `dev-unsafe-change-me` | `app.py` | 높음 — 세션 위조, 토큰 위조 가능 |
| 2 | `MAIL_PASSWORD` | `<GMAIL_APP_PASSWORD>` | `app.py` | 높음 — Gmail 앱 비밀번호 노출 |
| 3 | `MAIL_USERNAME` | `<SMTP_USERNAME>` | `app.py` | 중간 — 스팸/피싱 악용 가능 |
| 4 | Admin 비밀번호 | `<ADMIN_PASSWORD>` | `initialization.py` | 중간 — 관리자 계정 탈취 가능 |
| 5 | DB URI | `sqlite:///users.sqlite` | `app.py` | 낮음 — Cloud DB 전환 시 변경 필요 |

## 환경변수 전환 방법

### 1. `.env` 파일 생성 (프로젝트 루트)

```env
SECRET_KEY=<RANDOM_STRING>
MAIL_USERNAME=<SMTP_USERNAME>
MAIL_PASSWORD=<GMAIL_APP_PASSWORD>
ADMIN_PASSWORD=<STRONG_PASSWORD>
DATABASE_URI=<DATABASE_URI>
```

### 2. `.gitignore`에 추가

```
.env
```

### 3. `app.py` 수정

```python
import os
from dotenv import load_dotenv

load_dotenv()

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI')
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
```

### 4. `initialization.py` 수정

```python
import os

admin_password = os.environ.get('ADMIN_PASSWORD', 'admin')
admin_user = User(
    ...
    password=admin_password,  # 추후 해싱 적용 필요
    ...
)
```

### 5. 필요한 패키지

```bash
pip install python-dotenv
```

## 비밀번호 해싱 (별도 작업)

현재 모든 비밀번호가 평문 저장 상태. 환경변수 전환과 별개로 `werkzeug.security`를 적용해야 함:

```python
from werkzeug.security import generate_password_hash, check_password_hash

# 저장 시
user.password = generate_password_hash(password)

# 검증 시
check_password_hash(user.password, input_password)
```

해당 변경이 필요한 위치:
- `routes.py:88` — 회원가입 시 저장
- `routes.py:130` — 로그인 시 비교
- `routes.py:422` — 비밀번호 재설정 시 저장
- `routes.py:952` — 계정 편집 시 비교
- `routes.py:967` — 계정 편집 시 저장
- `initialization.py:86` — 어드민 계정 시딩

---

*작성일: 2026-04-03*
*Updated: 2026-04-14*
