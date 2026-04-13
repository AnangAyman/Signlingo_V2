# 계정/시크릿 관련 메모 (공유용)

이 문서는 팀 공유를 위해 **시크릿/패스워드의 실제 값은 절대 적지 않는다.**

## Admin 계정 (seed-data / initialization.py)

| 항목 | 값 |
|------|------|
| **Email** | `admin@example.com` |
| **Password** | `.env`의 `ADMIN_PASSWORD`로 설정 (레포에 값 저장 금지) |
| **Username** | `@admin` |
| **Name** | Admin |
| **Age** | 99 |
| **Lives** | 100,000 |
| **Points** | 10,000 (Diamond 리그) |
| **is_verified** | True |

## SMTP 메일 계정 (app.py)

| 항목 | 값 |
|------|------|
| **MAIL_USERNAME** | `.env`의 `MAIL_USERNAME` |
| **MAIL_PASSWORD** | `.env`의 `MAIL_PASSWORD` (Gmail 앱 비밀번호) |

## 비고

- 현재 메일 설정이 없으면 `MAIL_SUPPRESS_SEND=True`로 동작하며 이메일이 발송되지 않는다.
- 비밀번호 해싱(회원가입/로그인/재설정)은 별도 작업으로 진행.

---

*Updated: 2026-04-14*
