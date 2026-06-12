import os
import socket
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import dj_database_url

try:
    import pymysql

    pymysql.install_as_MySQLdb()
except ImportError:
    # If PyMySQL is missing, Django will surface a clearer backend error later.
    pass


BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
DJANGO_INSTANCE_DIR = PROJECT_ROOT / "django_instance"
DJANGO_INSTANCE_DIR.mkdir(exist_ok=True)


def _load_local_env(path: Path) -> None:
    """Load a local .env file without adding a new dependency."""
    if not path.exists():
        return

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _normalize_database_url(value: str) -> str:
    """Convert SQLAlchemy-style URLs into a form dj-database-url understands."""
    if not value:
        return value

    parsed = urlparse(value)
    if parsed.scheme == "mysql+pymysql":
        return urlunparse(parsed._replace(scheme="mysql"))
    return value


def _is_local_tunnel_database(value: str) -> bool:
    """Detect the documented SSH tunnel database URL."""
    parsed = urlparse(value)
    return parsed.scheme == "mysql" and parsed.hostname in {
        "127.0.0.1",
        "localhost",
        "host.docker.internal",
    } and parsed.port == 3307


def _is_tcp_port_open(host: str, port: int, timeout: float = 0.8) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


# Keep local development aligned with the repo's .env file.
_load_local_env(PROJECT_ROOT / ".env")

# Support both names so older docs and current Django settings stay in sync.
if "DATABASE_URL" not in os.environ and "DATABASE_URI" in os.environ:
    os.environ["DATABASE_URL"] = _normalize_database_url(os.environ["DATABASE_URI"])
if "DATABASE_URI" not in os.environ and "DATABASE_URL" in os.environ:
    os.environ["DATABASE_URI"] = os.environ["DATABASE_URL"]

sqlite_database_url = f"sqlite:///{(DJANGO_INSTANCE_DIR / 'db.sqlite3').as_posix()}"
configured_database_url = os.environ.get("DATABASE_URL") or os.environ.get("DATABASE_URI")
if configured_database_url:
    normalized_database_url = _normalize_database_url(configured_database_url)
    if _is_local_tunnel_database(normalized_database_url):
        parsed_database_url = urlparse(normalized_database_url)
        tunnel_host = parsed_database_url.hostname or "127.0.0.1"
        tunnel_port = parsed_database_url.port or 3307
        if not _is_tcp_port_open(tunnel_host, tunnel_port):
            print(
                f"[signlingo] Warning: SSH tunnel {tunnel_host}:{tunnel_port} is unavailable; "
                f"falling back to SQLite at {DJANGO_INSTANCE_DIR / 'db.sqlite3'}",
                file=sys.stderr,
            )
            os.environ["DATABASE_URL"] = sqlite_database_url
            os.environ["DATABASE_URI"] = sqlite_database_url

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

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")
FRONTEND_APP_URL = os.environ.get("FRONTEND_APP_URL", "").rstrip("/")

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
        default=sqlite_database_url,
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
