# Authentication Flow Reference

This document describes the current Django-based authentication flow in SignLingo.
It covers:

- `register`
- `login`
- Google OAuth sign-in from the register/login screens

## Entry Points

| Action | Route | View |
|---|---|---|
| Register page | `/register` | `accounts_port.views.register` |
| Login page | `/login` | `accounts_port.views.login` |
| Start Google OAuth | `/login/google` | `accounts_port.views.google_login` |
| Google OAuth callback | `/login/google/callback` | `accounts_port.views.google_callback` |

These routes are registered in `django_port/accounts_port/urls.py` and included under the project root URL router.

## Shared Session Keys

The auth views use these session values:

- `user`: stores the authenticated user's email
- `user_id`: stores the authenticated user's primary key
- `google_oauth_state`: stores the anti-CSRF state token for OAuth
- `google_oauth_next`: stores the redirect target after Google sign-in
- `google_oauth_entry`: stores whether Google OAuth started from `login` or `register`

## Register Flow

### Frontend

- The register form lives in `templates/sign_up.html`.
- The form posts with `method="POST"` to the current page path because no explicit `action` is set.
- The page includes a Google button that calls `url_for('auth.google_login')`.
- The register Google button currently calls `url_for('auth.google_login', entry='register')`.
- Client-side validation in `static/js/signup_logic.js` checks:
  - all fields are filled
  - email format is valid
  - age is a positive number
  - password length is at least 8
  - password and confirmation match

### Backend

`accounts_port.views.register(request)` is decorated with `@csrf_exempt`, so it does not require a CSRF token.

On `POST`:

1. Reads `name`, `age`, `email`, `password`, and `confirm-password` from `request.POST`.
2. Rejects the request if passwords do not match.
3. Validates and normalizes the email with `email_validator`.
4. Rejects the request if the email already exists in the `user` table.
5. Derives a username from the user's initials with `get_initials()` and `generate_username()`.
6. Creates a new `User` row with:
   - `name`
   - `age`
   - `email`
   - `username`
   - `is_verified=True`
7. Hashes the password with `user.set_password(password)`.
8. Stores the login session:
   - `request.session["user"] = user.email`
   - `request.session["user_id"] = user.id`
9. Redirects to `auth:start`.

### Important Behavior

- Registration currently bypasses email verification in the code path because `is_verified` is set to `True` immediately.
- The user record is written to the legacy `user` table, not Django's built-in `auth_user`.

## Login Flow

### Frontend

- The login form lives in `templates/login.html`.
- Like register, it posts back to the current URL with `method="POST"`.
- The Google button routes to `/login/google`.
- The login Google button routes to `/login/google?entry=login`.
- `static/js/login_logic.js` performs a small client-side check before submit, but the backend is the source of truth.
- The script expects `id="email"`, `id="password"`, and `id="error-message"`, while the current template does not expose those exact IDs, so that guard is not reliable as written.

### Backend

`accounts_port.views.login(request)` is also decorated with `@csrf_exempt`.

On `POST`:

1. Reads `email` and `password`.
2. Fetches the first `User` row matching the email.
3. Calls `user.check_password(password, upgrade_legacy=True)`.
4. If the password check fails, re-renders `login.html` with `Invalid credentials.`
5. If the login succeeds:
   - sets `user.is_verified = True`
   - updates `user.last_login_date` to `timezone.localdate()`
   - saves the user
   - upgrades the password hash if the stored password was still legacy plain text
6. Stores the session:
   - `request.session["user"] = user.email`
   - `request.session["user_id"] = user.id`
7. Redirects to `auth:dashboard`.

### Important Behavior

- Login currently auto-promotes `user.is_verified = True` on successful credential login.
- That means the current local email verification policy is effectively disabled even for non-Google accounts.

### Legacy Password Upgrade

The `User.check_password()` method in `django_port/legacy_port/models.py` supports old plain-text passwords.
When `upgrade_legacy=True` and the password matches a legacy row, the model rewrites the stored password to a Django hash before the login completes.

## Google OAuth Flow

Google OAuth is implemented manually in `accounts_port.views.google_login()` and `google_callback()`.
The code uses direct HTTP calls to Google, not `django-allauth` or `python-social-auth`.

### Required Settings

Google OAuth only runs when all three settings are present:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

These are loaded from environment variables in `django_port/signlingo_django/settings.py`.
The default redirect URI is:

`http://127.0.0.1:8000/login/google/callback`

### Start Step: `/login/google`

`google_login(request)` performs these steps:

1. Verifies that the Google settings are configured.
2. Generates a random state token with `secrets.token_urlsafe(32)`.
3. Stores the state in `request.session["google_oauth_state"]`.
4. Stores the post-login destination in `request.session["google_oauth_next"]`.
   - It uses `?next=` from the query string if present.
   - Otherwise it defaults to `auth:dashboard`.
5. Stores the originating entry point in `request.session["google_oauth_entry"]`.
   - `login` when Google sign-in started from the login page
   - `register` when it started from the register page
6. Redirects the browser to:
   - `https://accounts.google.com/o/oauth2/v2/auth`

The authorization request includes:

- `client_id`
- `redirect_uri`
- `response_type=code`
- `scope=openid email profile`
- `state`
- `access_type=offline`
- `prompt=select_account`

### Callback Step: `/login/google/callback`

`google_callback(request)` handles the Google redirect.

It validates the flow in this order:

1. Confirms the Google settings are configured.
2. If Google returned `error`, it flashes the failure message and returns to the originating entry page.
3. Compares the returned `state` against `request.session["google_oauth_state"]`.
4. Requires a `code` query parameter.
5. Exchanges the authorization code for an access token by POSTing to:
   - `https://oauth2.googleapis.com/token`
6. Uses the access token to call:
   - `https://openidconnect.googleapis.com/v1/userinfo`
7. Reads the Google profile fields:
   - `sub` for the Google subject ID
   - `email` for the account email
   - `name` or `given_name` for the display name
   - `email_verified` for Google-side email verification status

If any step fails, the view flashes a message and redirects back to the originating entry page.

Failure paths explicitly cover:

- Google OAuth not configured
- provider returned `error`
- state mismatch
- missing authorization `code`
- token exchange request failure
- missing access token
- userinfo request failure
- incomplete Google profile
- `email_verified is False`

### Account Matching Rules

After the Google profile is loaded, the code resolves the local account in this order:

1. Look up a user by `email`
2. If no email match exists, look up a user by `google_id`

That means email is the primary matching key in the current implementation.
If a local account already exists with the same email, the Google subject ID is attached to that account.

### New User Creation

If no user matches the Google profile, the code creates a new `User` row with:

- `name` from Google
- `age=None`
- `email`
- `username` generated from initials
- `is_verified=True`
- `google_id=sub`

The code also sets a random password with `secrets.token_urlsafe(32)`.
That password is not used for Google sign-in; it only satisfies the table's password field.
No local verification email is sent for Google-created accounts in the current implementation.

### Existing User Update

If a user already exists, the callback updates:

- `name` if it is currently empty
- `email`
- `google_id`
- `is_verified=True`
- `username` if it is currently empty

### Finalization

After the account is resolved:

1. The session is populated with `user` and `user_id`.
2. `google_oauth_state` is removed from the session.
3. `google_oauth_entry` is removed from the session.
4. `google_oauth_next` is removed from the session and used as the redirect target.
5. A success message is flashed:
   - `Signed in with Google successfully.`
6. The user is redirected to the final route.

## Practical Notes

- The login and register views are intentionally kept in `accounts_port` so auth behavior is isolated from the rest of the app.
- The current implementation uses the legacy `user` table, but the Django project provides the request/session layer and URL routing.
- The Google flow depends on external Google endpoints, so local testing requires valid Google OAuth credentials and the redirect URI configured in the Google console.
- Current email verification behavior is globally relaxed: local signup also sets `is_verified=True`, so Google auto-verification is not the only bypass in the current codebase.
- The login and register templates explicitly distinguish Google entry intent:
  - login page starts OAuth with `entry=login`
  - register page starts OAuth with `entry=register`
