#!/bin/bash
# Primeiro boot da máquina de teste (user-data da EC2, ADR 0033). Instala Docker, clona o nosso fork,
# gera os segredos locais, liga o Caddy (HTTPS automático) e agenda a atualização a cada 2 min, que
# baixa do ECR as imagens ARM geradas pelo GitHub do fork (a máquina não faz build).
# __HOST__, __BUCKET__ e __REGISTRO__ são trocados pelo criar-servidor.sh.
set -euxo pipefail
exec > /var/log/faperon-inicializar.log 2>&1

HOST="__HOST__"
BUCKET="__BUCKET__"
REGISTRO="__REGISTRO__"
REPO="https://github.com/justr1de/faperon-novo.git"
DIR=/opt/faperon

# Folga para picos (migrações, PDF, Zétele) numa máquina de 2 GB
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

timedatectl set-timezone America/Porto_Velho
apt-get update
apt-get install -y ca-certificates curl git unzip unattended-upgrades
systemctl enable --now unattended-upgrades
curl -fsSL https://get.docker.com | sh
# AWS CLI para a arquitetura da máquina (aarch64 na t4g, x86_64 na t3)
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscli.zip
unzip -q /tmp/awscli.zip -d /tmp && /tmp/aws/install

# -b main: o branch padrão do fork é o `servidor`, que só guarda o workflow das imagens
git clone -b main "$REPO" "$DIR"
cd "$DIR"
mkdir -p /etc/faperon
echo "$REGISTRO" > /etc/faperon/registro

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
  -e "s|^GUNICORN_WORKERS=.*|GUNICORN_WORKERS=2|" \
  .env
chmod 600 .env

# Chaves do Zétele (Anthropic) e da voz (Groq, Gemini): lidas do Parameter Store (cifradas) pelo papel
# da máquina (infra/aws-teste/chaves.sh, reaproveitado pelo atualizar-chaves.sh)
install -m 700 infra/aws-teste/chaves.sh /usr/local/bin/faperon-chaves
set +x
/usr/local/bin/faperon-chaves
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

# Atualização a cada 2 min: compose do fork + imagens do ECR (infra/aws-teste/atualizar.sh)
install -m 755 infra/aws-teste/atualizar.sh /usr/local/bin/faperon-atualizar
cat > /etc/systemd/system/faperon-atualizar.service <<EOF
[Unit]
Description=Atualiza o FAPERON de teste (fork + imagens do ECR)
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/faperon-atualizar
EOF
cat > /etc/systemd/system/faperon-atualizar.timer <<EOF
[Unit]
Description=Confere o fork e o ECR a cada 2 minutos

[Timer]
OnBootSec=1min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
EOF

# Cópia diária do banco para o S3 (no Brasil), às 3 h; o bucket apaga as de mais de 30 dias
cat > /usr/local/bin/faperon-backup <<EOF
#!/bin/bash
set -euo pipefail
cd $DIR
docker compose exec -T db pg_dump -U faperon -d faperon | gzip | \\
  aws s3 cp - "s3://$BUCKET/backups/faperon-\$(date +%F).sql.gz" --region sa-east-1 --only-show-errors
EOF
chmod 700 /usr/local/bin/faperon-backup
cat > /etc/systemd/system/faperon-backup.service <<EOF
[Unit]
Description=Cópia do banco do FAPERON de teste para o S3

[Service]
Type=oneshot
ExecStart=/usr/local/bin/faperon-backup
EOF
cat > /etc/systemd/system/faperon-backup.timer <<EOF
[Unit]
Description=Cópia diária do banco

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Imagens antigas acumulam a cada versão: limpeza semanal
cat > /etc/cron.weekly/faperon-docker-limpeza <<'EOF'
#!/bin/sh
docker image prune -af --filter until=168h > /dev/null
EOF
chmod 755 /etc/cron.weekly/faperon-docker-limpeza

systemctl daemon-reload
systemctl enable --now faperon-atualizar.timer faperon-backup.timer
echo "pronto: https://$HOST (o site sobe quando as imagens estiverem no ECR)"
