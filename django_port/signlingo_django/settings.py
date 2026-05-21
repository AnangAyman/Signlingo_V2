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
# Keep email settings environment-driven so the team can re-enable real delivery
# without changing the Django code again.
EMAIL_BACKEND = os.environ.get("DJANGO_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.environ.get("DJANGO_EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("DJANGO_EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("DJANGO_EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_HOST_USER = os.environ.get("DJANGO_EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("DJANGO_EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("DJANGO_DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "signlingo@example.com")

render_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
allowed_hosts = [host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",") if host.strip()]
if render_hostname and render_hostname not in allowed_hosts and "*" not in allowed_hosts:
    allowed_hosts.append(render_hostname)
ALLOWED_HOSTS = allowed_hosts or ["*"]

# When the Next.js frontend is hosted on a separate domain, Django session
# cookies must be allowed in cross-site fetch requests.
_default_cookie_samesite = "None" if not DEBUG else "Lax"
SESSION_COOKIE_SAMESITE = os.environ.get("DJANGO_SESSION_COOKIE_SAMESITE", _default_cookie_samesite)
CSRF_COOKIE_SAMESITE = os.environ.get("DJANGO_CSRF_COOKIE_SAMESITE", SESSION_COOKIE_SAMESITE)
SESSION_COOKIE_SECURE = os.environ.get("DJANGO_SESSION_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
CSRF_COOKIE_SECURE = os.environ.get("DJANGO_CSRF_COOKIE_SECURE", str(not DEBUG)).lower() == "true"

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
    "games_port.apps.GamesPortConfig",
    "commerce_port",
    "legacy_port",
    # JSON API endpoints consumed by the Next.js frontend.
    "api_port",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # Keep CORS before SessionMiddleware so browser preflight requests from Next.js work.
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
