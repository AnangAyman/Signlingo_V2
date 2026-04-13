# SignLingo: Django Backend

SignLingo is now maintained as a Django-based backend for the capstone project. The current codebase keeps the existing templates and game flow, but the active server, routing, authentication flow, deployment setup, and tests now run through Django.

## Technology Stack

* **Backend:** Python, Django
* **Database:** SQLite by default, with `DATABASE_URL` support for hosted databases
* **Frontend:** HTML, CSS, JavaScript templates
* **Machine Learning:** TensorFlow/Keras, OpenCV, MediaPipe integration points with graceful fallback support
* **Containerization:** Docker, Docker Compose

## Project Structure

* `django_port/signlingo_django`: Django project settings and root URLs
* `django_port/accounts_port`: login, register, password reset, and account management
* `django_port/core_port`: landing page, dashboard, roadmap, and health check
* `django_port/social_port`: users, friends, and leaderboard
* `django_port/learning_port`: lessons, course pages, and lesson progress
* `django_port/games_port`: quizzes, ML game endpoints, prediction flow, and result summary
* `django_port/commerce_port`: premium, packages, payments, and shop logic
* `django_port/shared_port`: shared view helpers used across apps

## How to Run This Project

### Method 1: Docker (Recommended)

Run from the repository root:

```bash
docker compose up --build
```

After the container starts, open:

**[http://localhost:8001](http://localhost:8001)**

The container will automatically:

* run Django migrations
* seed starter data
* collect static files
* start the Django app with Gunicorn

### Method 2: Local Virtual Environment

From the repository root:

```bash
python -m venv venv
```

On Windows:

```bash
.\venv\Scripts\activate
pip install -r requirements.txt
python django_port\manage.py migrate
python django_port\manage.py bootstrap_legacy_data
python django_port\manage.py runserver
```

Open:

**[http://127.0.0.1:8000](http://127.0.0.1:8000)**

## Deployment

`render.yaml` is configured for Docker deployment on Render using the root `Dockerfile`.

Health check endpoint:

```text
/health/
```

## Notes

* The old Flask runtime has been retired from the active project flow.
* Some legacy data/model naming is still kept for migration compatibility.
* Password handling is being upgraded inside the Django flow while preserving compatibility with existing seeded or legacy users.
