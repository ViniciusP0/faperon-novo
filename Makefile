.PHONY: up down logs build seed snapshot ingest test lint typecheck web-test e2e funnel funnel-off

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

build:
	docker compose build

seed:
	docker compose run --rm api-dev python manage.py seed

snapshot:
	docker compose run --rm api-dev python manage.py snapshot

ingest:
	docker compose run --rm api-dev python manage.py ingest_sidra

test:
	docker compose run --rm api-dev pytest

lint:
	docker compose run --rm api-dev ruff check .
	cd apps/web && npm run lint

typecheck:
	docker compose run --rm api-dev mypy .
	cd apps/web && npm run typecheck

web-test:
	cd apps/web && npm test

e2e:
	cd apps/web && npm run test:e2e

funnel:
	tailscale funnel --bg 3000

funnel-off:
	tailscale funnel 3000 off

