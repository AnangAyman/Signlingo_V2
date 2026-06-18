# SignLingo

SignLingo is an AI-powered sign language learning platform built for the 2026 Capstone Design final project. The project combines a Next.js learner-facing frontend, a Django backend, AI/webcam practice features, translation support, Google OAuth, gamified progress tracking, and database-backed learner state.

## GitHub Repository

```text
https://github.com/AnangAyman/Signlingo_V2
```

The goal is to provide a complete learning loop rather than a set of isolated demos:

1. Sign in or create an account.
2. Study lessons and complete quiz activities.
3. Practice signs through the webcam.
4. Receive AI prediction or translation feedback.
5. Review XP, achievements, scores, and leaderboard progress.

## Main Features

- Account registration, login, session handling, and Google OAuth support
- Dashboard with learner progress, quick actions, XP, streak, and league status
- Lesson flow with videos, quizzes, and completion tracking
- Camera Practice for target-sign recognition
- Magic Touch game using camera-based sign interaction
- Translation Mode using webcam landmark sequences, GRU prediction, and Gemini-assisted sentence generation
- Gamification features including XP, achievements, rewards, activity counters, and leaderboard ranking
- Korean/English frontend localization
- Django JSON APIs consumed by the Next.js frontend
- Docker-based local verification path
- Oracle-oriented final deployment path with environment-driven database configuration and SQLite fallback for local development

## Architecture

```text
Learner Browser
   |
   | Next.js pages, camera UI, dashboard, lessons, games
   v
Next.js Frontend
   |
   | JSON APIs / rewrites / session-aware requests
   v
Django Backend
   |
   | Auth, progress, game routes, AI routes, translation routes
   v
Database / External Services
   |
   | Oracle MySQL HeatWave or local SQLite fallback
   | Google OAuth
   | Gemini translation
   | MediaPipe / model inference
```

The frontend provides the main user experience. Django owns authentication, session state, persistence, legacy-compatible game routes, AI endpoints, translation routes, and backend-only secrets. Sensitive credentials such as Google OAuth and Gemini API keys must remain server-side and should not be committed to the repository.

## Project Structure

```text
.
|-- django_port/                  # Active Django backend
|   |-- signlingo_django/          # Django settings, root URL config, WSGI/ASGI
|   |-- accounts_port/             # Login, register, Google OAuth, account flows
|   |-- api_port/                  # JSON APIs for Next.js
|   |-- core_port/                 # Landing/dashboard/health routes
|   |-- games_port/                # Quiz, Camera Practice, Magic Touch, translation routes
|   |-- learning_port/             # Lessons and learning progress
|   |-- legacy_port/               # Legacy-compatible data models and tests
|   |-- shared_port/               # Shared helpers, CORS, language utilities
|   `-- commerce_port/             # Premium/shop legacy-compatible routes
|-- frontend/                      # Next.js frontend application
|   |-- app/                       # App Router pages
|   |-- components/                # UI, gamification, lessons, translation components
|   |-- lib/                       # API client, auth store, i18n setup
|   `-- locales/                   # English/Korean locale files
|-- static/                        # Legacy/static assets used by Django routes
|-- templates/                     # Django/Jinja templates for legacy-compatible screens
|-- models/                        # ML model artifacts and training-related resources
|-- docker-compose.yml             # Local backend + frontend development setup
|-- Dockerfile                     # Django backend container
|-- requirements.txt               # Python direct dependencies
`-- requirements-lock.txt          # Python environment snapshot
```

## Local Setup

### Option 1: Docker Compose

From the repository root:

```bash
docker compose up --build
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Django backend: `http://localhost:8001`
- Backend health check: `http://localhost:8001/health/`

The Docker backend command runs migrations, seeds starter data, collects static files, and starts Gunicorn.

### Option 2: Run Backend and Frontend Separately

Backend:

```bash
python -m venv venv
```

Windows:

```bash
.\venv\Scripts\activate
pip install -r requirements.txt
python django_port\manage.py migrate
python django_port\manage.py bootstrap_legacy_data
python django_port\manage.py runserver
```

Backend default URL:

```text
http://127.0.0.1:8000
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Frontend default URL:

```text
http://localhost:3000
```

## Environment Variables

Create a local `.env` file from `.env.example` when running the backend locally. Do not commit real secrets.

Common backend variables:

```text
DJANGO_SECRET_KEY=change-me
DATABASE_URL=sqlite:///django_instance/db.sqlite3
GOOGLE_CLIENT_ID=change-me
GOOGLE_CLIENT_SECRET=change-me
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/login/google/callback
GEMINI_API_KEY=change-me
FRONTEND_APP_URL=http://localhost:3000
```

Common frontend variables:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_ORIGIN=http://localhost:8000
```

For the final hosted system, the frontend/backend production URLs and Oracle database credentials are managed through deployment environment settings. The code supports environment-driven database URLs and falls back to local SQLite when the documented local Oracle tunnel is unavailable.

## Important Routes

Frontend:

- `/` - landing page
- `/login` - login page
- `/signup` - registration page
- `/dashboard` - learner dashboard
- `/lessons` - lesson and quiz flow
- `/ai-game` - AI practice entry
- `/translation` - native frontend translation mode
- `/gamification` - achievements, rewards, and progress
- `/leaderboard` - leaderboard view

Backend/API examples:

- `/health/` - backend health check
- `/api/auth/login` - JSON login
- `/api/auth/me` - current authenticated user
- `/api/dashboard` - dashboard data
- `/api/lessons` - lesson list and progress
- `/api/add-xp` - XP persistence
- `/api/game-score` - Magic Touch best score persistence
- `/predict` - image-based sign prediction
- `/predict_gru` - sequence-based GRU prediction
- `/translate_sequence` - Gemini-assisted translation
- `/login/google` - Google OAuth start

## Verification Commands

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run build
npm run lint
```

Backend:

```bash
python django_port\manage.py check
python django_port\manage.py test
```

Docker smoke test:

```bash
docker compose up --build
```

Then verify:

```text
http://127.0.0.1:8001/health/
```

Final verification for the report included frontend build/type checks, lint with warnings but no errors, Django checks, Docker health verification, and a backend/API regression suite with 44 passing tests.

## Deployment Notes

- The frontend is designed to be deployed separately from the Django backend.
- Next.js rewrites proxy backend/API routes so the browser can use the frontend origin while requests are forwarded to Django.
- Django keeps backend-only credentials such as Google OAuth and Gemini API keys in environment variables.
- The final project direction uses Oracle VM and Oracle MySQL HeatWave for the production backend/database path.
- Local development can run with SQLite when Oracle access is not available.

Before final submission or demonstration, confirm that:

- `BACKEND_ORIGIN` or `NEXT_PUBLIC_API_URL` points to the correct final backend.
- Google OAuth redirect URI matches the deployed frontend/backend route.
- Oracle database connection is active if the final Oracle deployment is being demonstrated.
- Webcam features are tested on a device/browser with camera permission enabled.

## Known Limitations and Future Work

- Webcam recognition quality depends on lighting, camera angle, device, and browser permissions.
- Korean sign-language coverage should be expanded with a more complete and consistently labeled dataset.
- Some routes preserve legacy-compatible behavior while the project transitions to the Next.js + Django architecture.
- Production deployment screenshots, OAuth proof, Oracle proof, and final demo recordings should be kept in the final submission resources.

## Final Submission Checklist

- Confirm the final source branch includes the latest frontend, backend, AI, deployment, and README updates.
- Exclude local caches, `node_modules`, Python virtual environments, logs, and other generated files from the submitted zip.
- Include the final source code, this `README.md`, final PPT, demo/resources, and any required supporting files.
- Make sure the GitHub repository URL is visible in this README before creating the zip.
- Verify the submitted zip name follows the course rule:

```text
Team_6_Resources.zip
```

- Verify the final report file name follows the course rule:

```text
Team_6_Technical_Report.docx
```

Only one team member should submit each final upload.

## Team Review Note

This README is prepared as a final-version draft. Team members should read it before submission and update any details that changed in the final branch, especially deployment URLs, Oracle connection status, Google OAuth status, and AI/webcam demo evidence.
