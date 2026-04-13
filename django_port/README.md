# Django Port

This folder now contains the active Django backend for SignLingo.

Run locally from this folder:

```powershell
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py bootstrap_legacy_data
..\venv\Scripts\python.exe manage.py runserver
```

Default URL: `http://127.0.0.1:8000`

Run with Docker from the repository root:

```powershell
docker compose up --build
```

Docker URL: `http://127.0.0.1:8001`

Render deployment:

- `render.yaml` is included for a free Render web service using the root `Dockerfile`
- Health check: `/health/`
- Default deployment uses SQLite for a quick demo/staging backend
- Later, you can attach Postgres by setting `DATABASE_URL` in Render without changing code

Notes:

- The original Flask runtime files have been retired from the active backend.
- Original explanatory comments were preserved inside the Django apps and the migration audit docs.
