#!/bin/bash
# Primeiro boot da máquina de teste (user-data da EC2). Instala Docker, clona o nosso fork, gera os
# segredos locais, sobe o site atrás do Caddy (HTTPS automático) e agenda a atualização a cada 2 min.
# __HOST__ é trocado pelo criar-servidor.sh pelo endereço público (ex.: 56-125-1-2.sslip.io).
set -euxo pipefail
exec > /var/log/faperon-inicializar.log 2>&1

HOST="__HOST__"
REPO="https://github.com/justr1de/faperon-novo.git"
DIR=/opt/faperon

# 2 GB de RAM não bastam para o build do Next com a API no ar: 4 GB de swap
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

apt-get update
apt-get install -y ca-certificates curl git unzip
curl -fsSL https://get.docker.com | sh
curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscli.zip
unzip -q /tmp/awscli.zip -d /tmp && /tmp/aws/install

git clone "$REPO" "$DIR"
cd "$DIR"

# Segredos gerados aqui mesmo; nunca saem da máquina
alea() { python3 -c "import secrets; print(secrets.token_urlsafe($1))"; }
cp .env.example .env
sed -i \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(alea 24)|" \
  -e "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$(alea 50)|" \
  -e "s|^DJANGO_ALLOWED_HOSTS=.*|DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,api,$HOST|" \
  -e "s|^DJANGO_CSRF_TRUSTED_ORIGINS=.*|DJANGO_CSRF_TRUSTED_ORIGINS=https://$HOST|" \
  -e "s|^SITE_URL=.*|SITE_URL=https://$HOST|" \
  -e "s|^GITHUB_WEBHOOK_SECRET=.*|GITHUB_WEBHOOK_SECRET=$(alea 32)|" \
  .env
chmod 600 .env

# Chave do Zétele: lida do Parameter Store (cifrada) pelo papel da máquina
set +x
( umask 077
  CHAVE=$(aws ssm get-parameter --region sa-east-1 --name /faperon-teste/anthropic-api-key --with-decryption --query Parameter.Value --output text)
  printf 'ANTHROPIC_API_KEY=%s\n' "$CHAVE" > .env.local )
set -x

# HTTPS: o Caddy pede o certificado ao Let's Encrypt e repassa tudo para o Next
mkdir -p /etc/caddy
cat > /etc/caddy/Caddyfile <<EOF
$HOST {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
EOF
docker run -d --name caddy --restart always --network host \
  -v /etc/caddy/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy_data:/data -v caddy_config:/config caddy:2

docker compose up -d --build

# Atualização: o mesmo infra/deploy.sh da vinicin, puxando o main do fork a cada 2 min
cat > /etc/systemd/system/faperon-deploy.service <<EOF
[Unit]
Description=Atualiza o FAPERON de teste a partir do main do fork
After=docker.service

[Service]
Type=oneshot
ExecStart=$DIR/infra/deploy.sh
EOF
cat > /etc/systemd/system/faperon-deploy.timer <<EOF
[Unit]
Description=Confere o main do fork a cada 2 minutos

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now faperon-deploy.timer
echo "pronto: https://$HOST"
