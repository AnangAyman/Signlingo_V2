# Week 7 — Google SSO Integration

## 목표
기존 이메일/비밀번호 로그인에 더해 **Google SSO 로그인**을 추가하고, Google 계정으로 로그인한 사용자는 이메일 인증 없이 바로 서비스를 사용할 수 있도록 구현한다.

---

## 선택 근거
- 현재 Gmail SMTP 앱 비밀번호 문제로 이메일 인증 메일 발송이 불안정함
- Google 로그인은 Google이 이메일 소유를 이미 검증하므로 `is_verified=True` 처리 가능
- 비밀번호 저장 부담을 줄이고, 이후 SSO API 확장의 기반으로 활용 가능
- Week 6에서 Oracle Cloud MySQL HeatWave 전환을 완료한 뒤 User 모델 변경을 안정적으로 마이그레이션할 수 있음

---

## 할 일

### 1. Google Cloud Console 설정
- [ ] Google Cloud 프로젝트 생성 또는 기존 프로젝트 선택
- [ ] OAuth consent screen 설정
  - 앱 이름
  - 지원 이메일
  - 개발자 연락처
- [ ] OAuth 2.0 Client ID 생성
  - Application type: Web application
- [ ] Authorized redirect URIs 등록

개발 환경:
```text
http://127.0.0.1:5000/login/google/callback
http://localhost:5000/login/google/callback
```

Docker 환경:
```text
http://localhost:5001/login/google/callback
```

배포 환경:
```text
https://your-domain.com/login/google/callback
```

### 2. 환경변수 추가
- [ ] `.env`에 Google OAuth 정보 추가
  ```env
  GOOGLE_CLIENT_ID=your_google_client_id
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  ```
- [ ] `.gitignore`에 의해 `.env`가 추적되지 않는지 확인
- [ ] 팀원에게 필요한 redirect URI와 환경변수 전달

### 3. 의존성 추가
- [ ] `requirements.txt`에 Authlib 추가
  ```text
  Authlib==1.3.0
  ```
- [ ] 로컬 `signlingo` conda 환경에서 import 테스트
  ```bash
  python -c "import authlib"
  ```

### 4. app.py OAuth 설정
- [ ] Authlib OAuth 객체 설정
- [ ] Google provider 등록
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`이 없을 때 앱이 죽지 않도록 처리
- [ ] Blueprint 내부 route에서 OAuth 객체를 접근할 방식 결정
  - `app.py`에서 생성 후 import
  - 별도 `extensions.py`로 분리

구현 예시:
```python
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

### 5. User 모델 변경
- [ ] `models.py`의 User 모델에 Google 계정 식별자 추가
  ```python
  google_id = db.Column(db.String(100), unique=True, nullable=True)
  ```
- [ ] OAuth 유저의 password 처리 방식 결정
  - 현재 `password = db.Column(db.String(80), nullable=False)`
  - Google 유저는 비밀번호가 없으므로 nullable 허용 또는 빈 문자열 저장 중 선택 필요
- [ ] 비밀번호 해싱 적용 시 `password` 길이 확장 검토
  - werkzeug hash는 80자를 넘을 수 있으므로 `db.String(255)` 권장
- [ ] migration 생성 및 Oracle MySQL HeatWave 적용
- [ ] 로컬 개발 시 SSH tunnel이 켜진 상태에서 migration 실행

명령 예시:
```bash
flask --app app.py db migrate -m "add google sso fields"
flask --app app.py db upgrade
```

### 6. Google 로그인 라우트 추가
- [ ] `/login/google` 라우트 구현
- [ ] `/login/google/callback` 라우트 구현
- [ ] Google userinfo에서 필요한 값 추출
  - `sub` → `google_id`
  - `email`
  - `name`
  - `picture`는 선택
- [ ] 신규 유저 자동 생성
- [ ] 기존 이메일 계정이 있으면 Google 계정 연결
- [ ] 로그인 세션 저장
  ```python
  session['user'] = user.email
  session['user_id'] = user.id
  ```
- [ ] 로그인 성공 후 `/dashboard`로 이동

### 7. 계정 연결 정책
- [ ] 같은 이메일의 기존 계정이 있으면 `google_id`만 연결
- [ ] 기존 계정이 미인증 상태여도 Google 로그인 성공 시 `is_verified=True` 처리
- [ ] 이미 다른 계정에 연결된 `google_id`로 로그인 시 해당 계정으로 로그인
- [ ] 이메일이 없는 Google 응답은 거부
- [ ] Google 응답의 `email_verified` 값 확인

권장 정책:
```text
google_id가 있으면 google_id 기준 로그인
없으면 email 기준 기존 계정 탐색
기존 계정이 있으면 google_id 연결
기존 계정이 없으면 신규 계정 생성
Google email_verified가 true일 때만 is_verified=True
```

### 8. 로그인/회원가입 UI 수정
- [ ] `templates/login.html`에 Google 로그인 버튼 추가
- [ ] 필요 시 `templates/sign_up.html`에도 Google 가입 버튼 추가
- [ ] `static/css/login_style.css`에 버튼 스타일 추가
- [ ] 기존 이메일/비밀번호 로그인 흐름 유지

### 9. 이메일 인증 흐름 정리
- [ ] Google 로그인 유저는 이메일 인증 메일 발송하지 않음
- [ ] 일반 이메일 가입은 기존 인증 로직 유지 또는 임시 완화 여부 결정
- [ ] SMTP 실패 시 사용자 안내 문구 개선
- [ ] 문서상 권장안:
  - Google SSO: 즉시 인증 완료
  - 이메일 가입: SMTP 복구 전까지 정책 재검토

### 10. 테스트
- [ ] Google 로그인 버튼 노출 확인
- [ ] Google OAuth redirect 정상 동작
- [ ] 신규 Google 계정 자동 가입 확인
- [ ] 기존 이메일 계정과 Google 계정 연결 확인
- [ ] `is_verified=True` 처리 확인
- [ ] 세션 저장 후 dashboard 접근 확인
- [ ] 로그아웃 후 재로그인 확인
- [ ] Oracle MySQL HeatWave에 `google_id` 저장 확인
- [ ] Google 환경변수가 없을 때 기존 로그인은 정상 동작하는지 확인

---

## 예상 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `requirements.txt` | `Authlib` 추가 |
| `app.py` | OAuth provider 설정 |
| `models.py` | `google_id` 필드 및 password 정책 수정 |
| `routes.py` | Google login/callback 라우트 추가 |
| `templates/login.html` | Google 로그인 버튼 추가 |
| `templates/sign_up.html` | 필요 시 Google 가입 버튼 추가 |
| `static/css/login_style.css` | Google 버튼 스타일 |
| `migrations/` | User 모델 변경 마이그레이션 |
| `.env` | Google OAuth 환경변수 추가 |

---

## 리스크

| 항목 | 위험 | 대응 |
|------|------|------|
| Redirect URI 불일치 | Google 로그인 실패 | 개발/Docker/배포 URI 모두 등록 |
| 기존 이메일 계정 중복 | 계정이 2개 생성될 수 있음 | email 기준 linking 정책 적용 |
| password nullable 문제 | OAuth 유저 생성 실패 | password 컬럼 정책 선결정 |
| Oracle MySQL migration 실패 | SSO 필드 적용 불가 | Week 6 DB migration 흐름 안정화 |
| SSH tunnel 누락 | migration 또는 OAuth 테스트 중 DB 접속 실패 | Google SSO 작업 전 tunnel 실행 여부 확인 |
| 환경변수 누락 | 앱 시작 또는 로그인 실패 | Google 로그인 버튼 비활성화 또는 에러 안내 |

---

## 완료 기준

- [ ] Google 로그인 버튼으로 OAuth 인증 시작 가능
- [ ] Google callback에서 유저 생성 또는 기존 계정 연결 성공
- [ ] Google 로그인 유저가 `is_verified=True`로 저장됨
- [ ] 로그인 세션이 정상 생성되고 dashboard 접근 가능
- [ ] Oracle MySQL HeatWave에 `google_id`가 저장됨
- [ ] 기존 이메일/비밀번호 로그인 흐름이 깨지지 않음

---

## 다음 작업 후보

- [ ] 비밀번호 해싱 적용
- [ ] reset_tokens DB 테이블 이전
- [ ] SSO API 구조 확장
- [ ] State Sync 엔드포인트 설계
- [ ] 이메일 인증 방식 재검토

---

*Week 7 계획 작성일: 2026-04-14*
*Follow-up 반영일: 2026-04-14*
*주요 작업: Google SSO Integration*
