#!/bin/bash
# Leva as chaves do .env.local (Anthropic, Groq e Gemini) para o Parameter Store e para a máquina de
# teste, sem mostrar os valores na tela. Uso, a partir da raiz do repositório:
#   bash infra/aws-teste/atualizar-chaves.sh
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-dataro}" AWS_REGION=sa-east-1 AWS_DEFAULT_REGION=sa-east-1
cd "$(dirname "$0")/../.."
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# nome no .env.local -> parâmetro em /faperon-teste/
for par in ANTHROPIC_API_KEY:anthropic-api-key GROQ_API_KEY:groq-api-key GEMINI_API_KEY:gemini-api-key; do
  nome=${par%%:*} parametro=/faperon-teste/${par#*:}
  ( umask 077
    python3 - "$nome" "$TMP/valor" <<'PY'
import re, sys
m = re.search(rf"^{sys.argv[1]}=(.+)$", open(".env.local").read(), re.M)
open(sys.argv[2], "w").write(m.group(1).strip().strip('"') if m else "")
PY
  )
  if [ -s "$TMP/valor" ]; then
    aws ssm put-parameter --name "$parametro" --type SecureString --value "file://$TMP/valor" --overwrite > /dev/null
    echo "$nome -> $parametro"
  else
    echo "$nome: ausente no .env.local, pulado"
  fi
  rm -f "$TMP/valor"
done

# Na máquina: refaz o .env.local a partir do Parameter Store e reinicia a API
INST=$(aws ec2 describe-instances --filters Name=tag:Name,Values=faperon-teste Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
CID=$(aws ssm send-command --instance-ids "$INST" --document-name AWS-RunShellScript \
  --comment "FAPERON: atualiza as chaves do .env.local" \
  --parameters 'commands=["/usr/local/bin/faperon-chaves","cd /opt/faperon && docker compose -f docker-compose.yml -f /etc/faperon/docker-compose.teste.yml up -d --no-build --force-recreate api scheduler >/dev/null && echo api reiniciada"]' \
  --query Command.CommandId --output text)
aws ssm wait command-executed --command-id "$CID" --instance-id "$INST" || true
aws ssm get-command-invocation --command-id "$CID" --instance-id "$INST" --query StandardOutputContent --output text
