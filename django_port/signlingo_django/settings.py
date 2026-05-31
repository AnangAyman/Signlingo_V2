import os
from pathlib import Path

import dj_database_url


BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
DJANGO_INSTANCE_DIR = PROJECT_ROOT / "django_instance"
DJANGO_INSTANCE_DIR.mkdir(exist_ok=True)

# Required for session management, mirroring the role Flask's SECRET_KEY had in app.py.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-signlingo-dev-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"

# The Flask app.py also carried Gmail SMTP settings here.
# Email delivery is intentionally left out of the current Django port until the team
# decides whether to re-enable real verification/reset emails.

render_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
allowed_hosts = [host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",") if host.strip()]
if render_hostname and render_hostname not in allowed_hosts and "*" not in allowed_hosts:
    allowed_hosts.append(render_hostname)
ALLOWED_HOSTS = allowed_hosts or ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Feature apps split the former monolithic Flask routes.py into ownership-based modules.
    "core_port",
    "accounts_port",
    "social_port",
    "learning_port",
    "games_port",
    "commerce_port",
    "legacy_port",
    # JSON API for the Next.js frontend.
    "api_port",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # CorsMiddleware must come before SessionMiddleware so OPTIONS pre-flights
    # are handled before Django touches the session or CSRF token.
    "shared_port.cors_middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "signlingo_django.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.jinja2.Jinja2",
        "DIRS": [PROJECT_ROOT / "templates"],
        "APP_DIRS": False,
        "OPTIONS": {
            "environment": "signlingo_django.jinja2.environment",
        },
    },
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "signlingo_django.wsgi.application"
ASGI_APPLICATION = "signlingo_django.asgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{(DJANGO_INSTANCE_DIR / 'db.sqlite3').as_posix()}",
        conn_max_age=600,
    )
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [PROJECT_ROOT / "static"]
STATIC_ROOT = DJANGO_INSTANCE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Session / Cookie settings for the Next.js frontend
# ---------------------------------------------------------------------------
# Allow the frontend on localhost:3000 to send the session cookie when calling
# the Django API on localhost:8000.  In production, set SESSION_COOKIE_SAMESITE
# to "None" and SESSION_COOKIE_SECURE to True (requires HTTPS).
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
CSRF_COOKIE_SAMESITE = os.environ.get("CSRF_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SECURE = os.environ.get("CSRF_COOKIE_SECURE", "false").lower() == "true"
# Exempt the JSON API prefix from CSRF checks; the API uses session auth only.
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
