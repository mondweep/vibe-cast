# NE India Pulse — single-container image for GCP Cloud Run (ADR-0002/0004).
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080 \
    PULSE_WINDOW_HOURS=6

WORKDIR /app

# Install dependencies first (better layer caching).
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir .

# Run as non-root.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8080

# Cloud Run injects $PORT; bind to it. Single worker (scale via Cloud Run).
CMD ["sh", "-c", "exec uvicorn ne_pulse.api.app:app --host 0.0.0.0 --port ${PORT}"]
