#!/bin/bash
# Monta o .env.local da máquina a partir do Parameter Store (cifrado), lido pelo papel da máquina:
# Anthropic (Zétele) e Groq e Gemini (voz). A chave que não existir fica de fora (a voz se desliga
# sozinha). O prefixo segue o ambiente (/faperon-teste/ ou /faperon-producao/). Instalado como
# /usr/local/bin/faperon-chaves pelo inicializar.sh e pelo atualizar-chaves.sh.
set -euo pipefail
umask 077
AMBIENTE=$(cat /etc/faperon/ambiente 2>/dev/null || echo teste)
destino=/opt/faperon/.env.local
: > "$destino.novo"
for par in ANTHROPIC_API_KEY:anthropic-api-key GROQ_API_KEY:groq-api-key GEMINI_API_KEY:gemini-api-key; do
  valor=$(aws ssm get-parameter --region sa-east-1 --name "/faperon-$AMBIENTE/${par#*:}" --with-decryption \
    --query Parameter.Value --output text 2>/dev/null || true)
  if [ -n "$valor" ]; then printf '%s=%s\n' "${par%%:*}" "$valor" >> "$destino.novo"; fi
done
mv "$destino.novo" "$destino"
