FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi8 \
      libjpeg62-turbo libopenjp2-7 zlib1g fonts-dejavu-core \
      shared-mime-info curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["web"]

# Testes, lint, mypy e comandos que escrevem em ./data (snapshot): roda como root.
FROM base AS dev
COPY requirements-dev.txt ./
RUN pip install -r requirements-dev.txt
COPY . .
RUN chmod +x /app/entrypoint.sh

# Produção: sem ferramentas de dev e sem root.
FROM base AS prod
RUN useradd --system --uid 10001 --home-dir /app app \
    && mkdir -p /app/staticfiles /tmp/faperon-cache \
    && chown app:app /app /app/staticfiles /tmp/faperon-cache
COPY --chown=app:app . .
RUN chmod +x /app/entrypoint.sh
USER app
