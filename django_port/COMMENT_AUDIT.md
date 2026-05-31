# Comment Audit

This audit records the original developer-authored comment-bearing files from the Flask codebase
and where their comments now live in the Django port.

## Files checked

- `app.py`
- `routes.py`
- `models.py`
- `initialization.py`
- `tertiary.py`
- `Dockerfile`
- `docker-compose.yml`

## Audit result

### `app.py`

- `SECRET_KEY  # Required for session management`
  Preserved in `signlingo_django/settings.py`.

- `MAIL_USERNAME  # <-- your email`
- `MAIL_PASSWORD  # <-- app password`
  Preserved conceptually in `signlingo_django/settings.py` as a note that SMTP/email settings existed
  in Flask and are intentionally deferred in Django for now.

- `# Import and register the Blueprint`
  Preserved conceptually in `signlingo_django/app_urls.py`, where Django delegates routes to feature apps.

- `# This command is for resetting the database during the build.`
- `"""Clears existing data and seeds the database with lessons and an admin user."""`
  Preserved conceptually in `legacy_port/management/commands/bootstrap_legacy_data.py`
  and `legacy_port/services.py`.

### `routes.py`

- Authentication section comments
  Preserved in `accounts_port/views.py`.

- Weekly streak comments
  Preserved in `shared_port/view_helpers.py`.

- Leaderboard/friends section comments
  Preserved in `social_port/views.py`.

- Result summary / game page comments
  Preserved in `games_port/views.py` and `learning_port/views.py`.

- Shop comments
  Preserved in `commerce_port/views.py`.

- CNN-LSTM / MediaPipe / debug image comments
  Preserved in `legacy_port/services.py`.

- Blueprint-specific comment (`Define the Blueprint`)
  Preserved conceptually by Django app routing in `signlingo_django/app_urls.py`.

- Old debugging comments such as `#! For debugging delete later`
  Not copied verbatim into Django because they were temporary developer notes rather than stable documentation.

- Old commented-out email sending blocks
  Preserved conceptually via notes in `accounts_port/views.py` and `signlingo_django/settings.py`
  that email verification/reset delivery is intentionally deferred.

### `models.py`

- Friendship association comment
- Streaks comment
- Add Friends comment
- Shop Functionality comment
- Relationship comments
- `item_key` / icon examples
  Preserved in `legacy_port/models.py`.

### `initialization.py`

- Docstrings and comments for default course/module/unit creation
- Lesson association comment
- Admin password warning
- Shop seeding intent
  Preserved in `legacy_port/services.py` and `legacy_port/management/commands/bootstrap_legacy_data.py`.

### `tertiary.py`

- Missing-last-name comment for initials
  Preserved in `legacy_port/services.py`.

- Session question tracking comment
  Preserved in `shared_port/view_helpers.py`.

### `Dockerfile`

- Base image, env vars, workdir, dependency install, copy, expose, and startup comments
  Preserved in `Dockerfile.django`.

### `docker-compose.yml`

- File sync and SQLite persistence comments
  Preserved in `docker-compose.django.yml`.

## Notes

- The goal of this audit is "no silent loss of explanatory intent."
- Where an original comment referred to Flask-only machinery that no longer exists in Django,
  the comment was preserved conceptually in the closest Django replacement instead of being copied blindly.
