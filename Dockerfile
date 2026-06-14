# Cloud Run / container image for the SignLingo Django + ML backend.
# Python 3.10 base keeps parity with the local environment.
FROM python:3.10.4-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Cloud Run's filesystem is read-only except /tmp; keep matplotlib's cache writable.
ENV MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /app

# System libs required by OpenCV / MediaPipe.
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake static files into the image at build time (no DB needed).
# A dummy secret keeps settings importable during collectstatic.
RUN DJANGO_SECRET_KEY=build-time-only DJANGO_DEBUG=false \
    python django_port/manage.py collectstatic --noinput

EXPOSE 8080

# Cloud Run injects PORT (8080). Migrations are NOT run here — they run once as a
# separate step (Cloud Run Job or local) so cold starts stay fast.
# Single worker keeps the TensorFlow model's memory footprint low; threads handle
# concurrent requests while TF releases the GIL during inference.
CMD ["sh", "-c", "gunicorn signlingo_django.wsgi:application --chdir django_port --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 8 --timeout 120"]
