## Django Migration Parity Audit

This note tracks whether the original Flask product behavior has been preserved in the Django port.

### Route Coverage

The original Flask `routes.py` endpoints have Django counterparts for:

- home, register, verify, login, logout
- dashboard, start, roadmap
- forgot-password, reset-password, edit-account
- leaderboard, users, add-friend, remove-friend, search-users
- premium, package, payment, shop, buy-item
- save-session-results, result-summary, get-summary-results
- video_learning, gamepage, mark-lesson-status, course
- get-question, get-question-ml, check-answer
- ml_game, capture, predict, magic_touch

### Data / Seed Coverage

The original Flask initialization flow is now covered by:

- `legacy_port/services.py`
- `legacy_port/management/commands/bootstrap_legacy_data.py`

That Django-side setup now seeds:

- the default course/module/unit structure
- lesson rows from `lessons.json`
- default shop items
- the default admin account

### ML Coverage

The original Flask ML prediction flow has been moved into:

- `legacy_port/services.py` for model loading and image prediction
- `games_port/views.py` for the request/response layer

The Django port now restores the required ML runtime dependencies in `requirements.txt` and loads the BISINDO model from `models/bisindo_static_model.h5`.

### Preserved Differences To Keep In Mind

- Email verification is still intentionally disabled, matching the practical project state used in the Flask flow.
- Password storage is now safer in Django because new passwords are hashed, while old plain-text rows are upgraded after successful login.
- `capture` currently redirects into the Django ML game flow instead of rendering a separate Flask-only capture template.

### Remaining Compatibility Pieces Kept On Purpose

- `signlingo_django/jinja2.py` keeps a Django-backed `url_for` helper so the existing templates can stay stable during migration.
- That helper should not be treated as removable residue until the templates that still rely on it are refactored first.

### Compatibility Pieces Already Removed

- The temporary `legacy_port/views.py` and `legacy_port/urls.py` compatibility routing layer has been removed because the active project router already points directly to the split feature apps.

### Current Validation Status

- Django system checks pass.
- Backend regression tests cover login, password reset, account editing, social flows, lesson progress, shop purchases, summary endpoints, capture routing, and ML error handling.
- The ML runtime imports successfully in the Django environment and the model loads successfully.

### Remaining Review Mindset

When removing more Flask remnants, do not treat old files as disposable unless their behavior has already been matched in Django first.
