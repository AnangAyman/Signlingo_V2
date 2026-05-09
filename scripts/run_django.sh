#!/usr/bin/env bash
# Start the Django backend for local development.
# Run from the repo root: bash scripts/run_django.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DJANGO_DIR="$REPO_ROOT/django_port"
VENV="$DJANGO_DIR/.venv"

# Create venv if it doesn't exist
if [ ! -d "$VENV" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV"
fi

source "$VENV/bin/activate"

# Install/update deps
pip install -q -r "$REPO_ROOT/django_requirements.txt"

cd "$DJANGO_DIR"

# Run migrations
python manage.py migrate --run-syncdb

# Seed lessons/questions from JSON files if the DB is empty
python manage.py bootstrap_legacy_data 2>/dev/null || true

# Start dev server
echo ""
echo "Django API running at http://localhost:8000"
echo "CORS allowed for: http://localhost:3000"
echo ""
python manage.py runserver 0.0.0.0:8000
