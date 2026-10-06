#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Espera o deploy em andamento (até 30 min) em vez de desistir: um push durante o build
# precisa ser publicado. Pushes em fila que encontram HEAD == origin/main viram "already up to date".
exec flock -w 1800 /tmp/faperon-deploy.lock -c "
  set -euo pipefail
  cd '$REPO_DIR'
  echo \"[\$(date -Is)] checking for updates\"
  git fetch origin main
  if [ \"\$(git rev-parse HEAD)\" != \"\$(git rev-parse origin/main)\" ]; then
    echo \"[\$(date -Is)] new commits found, deploying\"
    git reset --hard origin/main
    docker compose up -d --build
    docker image prune -f
    echo \"[\$(date -Is)] deploy finished at \$(git rev-parse --short HEAD)\"
  else
    echo \"[\$(date -Is)] already up to date\"
  fi
" >> "$REPO_DIR/infra/deploy.log" 2>&1
