# Comment Migration Map

This file tracks where key comments from the original Flask `app.py` and `routes.py`
were preserved in the Django port, so teammates can follow the migration without
losing the original implementation notes.

## From `app.py`

- `SECRET_KEY  # Required for session management`
  Preserved in `signlingo_django/settings.py`.

- `# Import and register the Blueprint`
  Replaced by Django URL delegation in `signlingo_django/app_urls.py`.

- `# This command is for resetting the database during the build.`
  The equivalent Django seed/bootstrap flow lives in `legacy_port/management/commands/bootstrap_legacy_data.py`
  and `legacy_port/services.py`.

## From `routes.py`

- `# ----------------------------------- AUTHENTICATION ------------------------------------------------`
  Preserved in `accounts_port/views.py`.

- Registration comments about email validation, normalized email, and temporarily disabled verification
  Preserved in `accounts_port/views.py`.

- Login comments about auto-verifying existing unverified users
  Preserved in `accounts_port/views.py`.

- `# ----------------------------------- FORGOT/RESET PASSWORD ROUTES ------------------------------------`
  Preserved in `accounts_port/views.py`.

- Comments about temporary reset-token handling and generic messages for security
  Preserved in `accounts_port/views.py`.

- Weekly streak comments such as Monday-to-Sunday calculation and backward streak counting
  Preserved in `shared_port/view_helpers.py`.

- Lesson/progress comments about seeded lessons and module progress
  Preserved in `shared_port/view_helpers.py`, `core_port/views.py`, and `learning_port/views.py`.

- `# ----------------------------------- Leaderboards page ----------------------------------------`
  Preserved in `social_port/views.py`.

- `# ----------------------------------- FRIENDS & USERS LIST -----------------------------------`
  Preserved in `social_port/views.py`.

- `# ----------------------------------- RESULT SUMMARY SYSTEM -----------------------------------`
  Preserved in `games_port/views.py`.

- `# ----------------------------------- GAME PAGE ------------------------------------------------`
  Preserved in `learning_port/views.py` and `games_port/views.py`.

- Comments about question shuffling, keeping correct answers, and adding points
  Preserved in `games_port/views.py`.

- `# ----------------------------------- SHOP Functionality --------------------------------------------`
  Preserved in `commerce_port/views.py`.

- Comments about inventory lookup, point checks, and item effects
  Preserved in `commerce_port/views.py`.

- `# ----------------------------------- CNN-LSTM MODEL ------------------------------------------------`
  Preserved conceptually in `legacy_port/services.py`, which now owns the model-loading
  and prediction logic that used to live at the bottom of `routes.py`.

- Comments about model compatibility, landmark normalization, keypoint extraction,
  debug image generation, and prediction flow
  Preserved in `legacy_port/services.py`.

## Additional source files now covered

- `models.py`
  Comments about the friendship association table, streak fields, add-friend helpers,
  shop functionality, relationship meaning, and `item_key` usage are preserved in
  `legacy_port/models.py`.

- `initialization.py`
  Docstrings and comments about creating the default course/module/unit structure,
  associating lessons with a unit, and the admin seed warning are preserved in
  `legacy_port/services.py` and `legacy_port/management/commands/bootstrap_legacy_data.py`.

- `tertiary.py`
  Comments about handling missing last names and question/session rotation are preserved in
  `legacy_port/services.py` and `shared_port/view_helpers.py`.

- `Dockerfile`
  Container setup comments were carried into the repository root `Dockerfile` so the Django container
  remains as understandable as the Flask one.

- `docker-compose.yml`
  Local container workflow comments were preserved in the repository root `docker-compose.yml`
  so the Docker-based setup stays understandable after the Django migration.
