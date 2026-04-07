# Django Port

This folder contains the parallel Django migration for SignLingo.

Run locally:

```powershell
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py bootstrap_legacy_data
..\venv\Scripts\python.exe manage.py runserver
```

Default URL: `http://127.0.0.1:8000`

Run with Docker:

```powershell
docker compose -f docker-compose.django.yml up --build
```

Docker URL: `http://127.0.0.1:8001`
