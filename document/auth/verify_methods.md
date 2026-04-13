# 사용자 인증(Verification) 방식 비교 및 적용 방안

## 현재 상태

- 이메일 인증 방식 사용 중 (Flask-Mail + Gmail SMTP)
- Gmail 앱 비밀번호가 만료/무효화되었거나, 로컬 환경에 설정되지 않아 메일 발송 실패
- 회원가입은 되지만 인증 메일이 안 날아가서 로그인 불가

---

## 인증 방식 비교

### 1. 이메일 링크 인증 (현재 방식)

**흐름:**
```
회원가입 → 인증 메일 발송 → 유저가 링크 클릭 → is_verified=True → 로그인 가능
```

**장점:**
- 가장 보편적인 방식
- 이메일 소유 확인 가능

**단점:**
- SMTP 설정 필요 (Gmail 앱 비밀번호, 포트, TLS 등)
- 앱 비밀번호 만료/정책 변경 시 발송 실패
- 스팸함에 빠질 수 있음
- 개발/테스트 환경에서 불편

**현재 문제:**
- `signlingolanguage@gmail.com`의 앱 비밀번호가 무효화됨
- 새 앱 비밀번호 발급 필요 (계정 관리자 필요)

---

### 2. 이메일 인증 코드 (OTP)

**흐름:**
```
회원가입 → 6자리 코드 메일 발송 → 유저가 코드 입력 → 검증 → 로그인 가능
```

**장점:**
- 링크 클릭보다 UX가 간단 (모바일에서 특히)
- 코드 만료 시간 설정 가능

**단점:**
- 여전히 SMTP 설정 필요 (현재 문제 해결 안 됨)
- 코드 저장/만료 로직 추가 구현 필요

**구현 시 추가 사항:**
```python
# models.py에 추가
class User(db.Model):
    ...
    verify_code = db.Column(db.String(6))
    verify_code_expires = db.Column(db.DateTime)
```

---

### 3. OAuth 소셜 로그인 (Google 등)

**흐름:**
```
"Google로 로그인" 클릭 → Google 인증 → 콜백으로 유저 정보 수신 → 자동 가입 + 인증 완료
```

**장점:**
- 이메일 인증 자체가 불필요 (Google이 이미 인증한 사용자)
- SMTP 설정 불필요
- 비밀번호 관리 불필요 (보안 부담 감소)
- UX가 가장 간편 (클릭 한 번)

**단점:**
- Google Cloud Console에서 OAuth 클라이언트 설정 필요
- 외부 서비스 의존성
- 콜백 URL 설정 필요 (배포 환경마다 다름)

**필요한 패키지:**
```
Authlib==1.3.0
```

**구현 개요:**

```python
# app.py에 추가
from authlib.integrations.flask_client import OAuth

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
```

```python
# routes.py에 추가
@auth_bp.route('/login/google')
def google_login():
    redirect_uri = url_for('auth.google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@auth_bp.route('/login/google/callback')
def google_callback():
    token = google.authorize_access_token()
    user_info = token['userinfo']
    
    email = user_info['email']
    name = user_info.get('name', 'Google User')
    
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            password='',  # OAuth 유저는 비밀번호 없음
            username=generate_username(name),
            is_verified=True,  # Google이 인증한 사용자
            google_id=user_info['sub']
        )
        db.session.add(user)
        db.session.commit()
    
    session['user'] = user.email
    session['user_id'] = user.id
    return redirect(url_for('auth.dashboard'))
```

```python
# models.py User 모델에 추가
google_id = db.Column(db.String(100), unique=True, nullable=True)
```

```env
# .env에 추가
GOOGLE_CLIENT_ID=<Google Cloud Console에서 발급>
GOOGLE_CLIENT_SECRET=<Google Cloud Console에서 발급>
```

**Google Cloud Console 설정 절차:**
1. https://console.cloud.google.com 접속
2. 프로젝트 생성 또는 선택
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs 추가:
   - 개발: `http://127.0.0.1:5000/login/google/callback`
   - 배포: `https://yourdomain.com/login/google/callback`
6. Client ID, Client Secret 복사 → `.env`에 저장

---

### 4. 인증 없이 즉시 사용

**흐름:**
```
회원가입 → 바로 로그인 가능
```

**장점:**
- 구현 가장 간단
- 가입 장벽 제로

**단점:**
- 스팸/봇 계정 생성 가능
- 이메일 소유 확인 불가

**구현:**
```python
# routes.py 회원가입에서
new_user = User(..., is_verified=True)  # 가입 즉시 인증 완료
```

---

## 추천 조합

학기 프로젝트 기준 최적 조합:

```
[1순위] Google OAuth 로그인
  → 인증 불필요, 비밀번호 관리 불필요, UX 최고

[2순위] 기존 이메일/비밀번호 가입 유지 (인증 없이 즉시 사용)
  → Google 계정이 없는 사용자 대비
  → is_verified=True로 기본 설정

[선택] 이메일 인증 복구
  → Gmail 앱 비밀번호 재발급 시 가능
```

이렇게 하면:
- Google 로그인 유저: OAuth로 자동 인증
- 이메일 가입 유저: 인증 없이 바로 사용 (학기 프로젝트이므로 스팸 위험 낮음)
- SMTP 의존성 제거 가능

---

## 관련 파일

| 파일 | 변경 내용 |
|------|-----------|
| `models.py` | User 모델에 `google_id` 필드 추가 |
| `app.py` | OAuth 설정 추가 |
| `routes.py` | Google 로그인/콜백 라우트 추가 |
| `requirements.txt` | `Authlib` 추가 |
| `.env` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 추가 |
| `templates/login.html` | "Google로 로그인" 버튼 추가 |

---

*작성일: 2026-04-03*
