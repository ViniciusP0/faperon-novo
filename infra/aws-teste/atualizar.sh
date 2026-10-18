#!/bin/bash
# Atualização da máquina (a cada 2 min, pelo faperon-atualizar.timer): traz os arquivos do compose do
# fork e as imagens do ECR; só reinicia o que mudou. Não faz build (ADR 0033).
# O ambiente vem de /etc/faperon/ambiente: "teste" (padrão) segue o main; "producao" segue o branch
# producao, que só muda quando alguém promove uma versão já testada.
set -euo pipefail
DIR=/opt/faperon
cd "$DIR"

exec flock -n /tmp/faperon-atualizar.lock bash -c '
  set -euo pipefail
  AMBIENTE=$(cat /etc/faperon/ambiente 2>/dev/null || echo teste)
  REF=main
  [ "$AMBIENTE" = producao ] && REF=producao
  git fetch -q origin "$REF"
  git reset -q --hard "origin/$REF"
  REGISTRO=$(cat /etc/faperon/registro)
  sed "s|__REGISTRO__|$REGISTRO|" "infra/aws-teste/docker-compose.$AMBIENTE.yml" > /etc/faperon/docker-compose.ambiente.yml
  aws ecr get-login-password --region sa-east-1 | docker login -u AWS --password-stdin "$REGISTRO" > /dev/null
  compose="docker compose -f docker-compose.yml -f /etc/faperon/docker-compose.ambiente.yml"
  # sem as imagens ainda (primeiro build no GitHub em andamento), tenta de novo na próxima volta
  $compose pull -q api scheduler web || { echo "[$(date -Is)] imagens ainda indisponíveis"; exit 0; }
  $compose up -d --no-build db api scheduler web
  docker image prune -f > /dev/null
' >> /var/log/faperon-atualizar.log 2>&1
