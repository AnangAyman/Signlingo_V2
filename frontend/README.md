# SignLingo Frontend

This Next.js app connects to the Django backend through `NEXT_PUBLIC_API_URL`.
If the variable is not set, local development uses `http://localhost:8000`
and production builds use the current Render backend.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

By default, `.env.example` points to a local Django backend at `http://localhost:8000`.

For the current Render demo backend, set:

```bash
NEXT_PUBLIC_API_URL=https://signlingo-django.onrender.com
```

The Django backend must allow the frontend origin through `CORS_ALLOWED_ORIGINS`
when the frontend is deployed separately.
