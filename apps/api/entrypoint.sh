#!/bin/sh
set -e

mode="${1:-web}"

wait_for_db() {
  python - <<'PY'
import os, time
import psycopg
for _ in range(60):
    try:
        psycopg.connect(
            host=os.environ.get("POSTGRES_HOST", "db"),
            dbname=os.environ.get("POSTGRES_DB", "faperon"),
            user=os.environ.get("POSTGRES_USER", "faperon"),
            password=os.environ.get("POSTGRES_PASSWORD", "faperon"),
        ).close()
        break
    except Exception:
        time.sleep(1)
PY
}

case "$mode" in
  web)
    wait_for_db
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
    python manage.py seed --if-empty
    exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 \
      --worker-class gthread \
      --workers "${GUNICORN_WORKERS:-3}" \
      --threads "${GUNICORN_THREADS:-4}" \
      --timeout "${GUNICORN_TIMEOUT:-60}"
    ;;
  scheduler)
    wait_for_db
    exec python manage.py run_scheduler
    ;;
  *)
    exec "$@"
    ;;
esac
