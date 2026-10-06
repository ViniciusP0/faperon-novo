# Deploy automático (webhook)

O servidor atualiza sozinho a cada push em `main`, sem precisar acessar a máquina manualmente.

Instalação (uma vez):

```bash
cp .env.example .env   # se ainda não existir; gerar GITHUB_WEBHOOK_SECRET com: python3 -c "import secrets; print(secrets.token_hex(32))"
sudo cp infra/faperon-webhook.service /etc/systemd/system/faperon-webhook.service
sudo systemctl daemon-reload
sudo systemctl enable --now faperon-webhook
tailscale funnel --bg --https=10000 9001   # Funnel só aceita 443, 8443 e 10000; 443 é o site e 8443 já está em uso por outro serviço neste servidor
```

Depois, em `github.com/ViniciusP0/faperon-novo` → Settings → Webhooks → Add webhook:

- Payload URL: `https://dt-server.tail3fe9ce.ts.net:10000/webhook`
- Content type: `application/json`
- Secret: o mesmo valor de `GITHUB_WEBHOOK_SECRET` do `.env`
- Eventos: só `push`

Operação:

- Ver se está no ar: `systemctl status faperon-webhook`
- Log de cada deploy: `infra/deploy.log` (ou `journalctl -u faperon-webhook -f` para o listener)
- `deploy.sh` só reconstrói quando há commit novo em `origin/main`; usa `flock` para não rodar dois deploys ao mesmo tempo
- `make funnel-off` desliga só a porta 3000 (site); o webhook fica em outra porta e continua no ar (antes usava `tailscale funnel reset`, que derrubava os dois)
- O `.env` do servidor precisa ter `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,api` (desde 06/10/2026 o padrão deixou de ser `*`). Sem `api`, o Next recebe 400 do Django em todas as páginas.
- `make seed`, `make snapshot` e `make ingest` usam o serviço `api-dev` (imagem de dev, roda como root); a primeira execução no servidor constrói essa imagem.

Validação ponta a ponta (2026-09-28): os commits de teste anteriores foram feitos e empurrados a partir do próprio `dt-server`, então `deploy.sh` sempre encontrou `HEAD` já igual a `origin/main` (log só mostra `already up to date`, nunca `new commits found, deploying`). Este commit foi feito e empurrado de uma máquina diferente do `dt-server` para exercitar de fato o caminho de rebuild.

# Checklist de operação (dt-server)

Desde 28/09/2026 (ADR 0021), o site e o deploy rodam permanentemente no `dt-server` (sempre ligado, na tailnet), não mais no notebook de um desenvolvedor. O checklist abaixo substitui o antigo checklist de demo no notebook.

Antes de uma apresentação (ou a qualquer momento, para conferir que está tudo no ar):

1. Conferir que os containers estão de pé: `docker compose ps` deve mostrar `api` como `healthy`.
2. Se o banco estiver vazio ou desatualizado: `make seed` (não depende do IBGE).
3. Confirmar o Funnel do site: `tailscale funnel status` deve mostrar a porta 3000 publicada. Se precisar religar: `make funnel` (ou `infra/funnel.ps1 -Up` num Windows).
4. Abrir a URL fora da rede local (celular em dados móveis, sem Tailscale) — dentro da tailnet o nome resolve direto para o `dt-server` e não passa pela entrada pública. Use `curl --resolve <nome>:<porta>:<IP público de entrada> ...` (veja `docs/erros-conhecidos/dificuldades.md`) ou o celular, e percorra Início -> Central -> Painel -> PDF.
5. Confirmar que `https://<url>/api/schema/` e `https://<url>/admin/` **não** abrem pelo Funnel (respondem 404).

Não é mais preciso desligar o Funnel depois da demo (`make funnel-off`): o site fica público continuamente por decisão do projeto (ADR 0014).

Notas:

- Containers usam `restart: unless-stopped`; o `dt-server` fica sempre ligado, então não há mais risco de suspensão/hibernação como no notebook (ver "A demo depende do notebook" em `docs/erros-conhecidos/dificuldades.md`, resolvido).
- Para saber se o link caiu, use um monitor de disponibilidade externo (por exemplo, UptimeRobot) na URL pública do site.
- O `scheduler` roda a ingestão ao subir se a última carga tiver mais de 3 dias.
- O Postgres não publica porta no host.
- Se a porta 443 do Funnel já estiver em uso por outro app (`tailscale funnel status`), publique em outra porta sem derrubá-lo: `tailscale funnel --bg --https=8443 3000` (URL termina em `:8443`) e desligue com `tailscale funnel --https=8443 off`.
- O proxy do Next só encaminha `/api/v1/`; `/api/schema/`, `/api/docs/` e `/admin/` respondem 404 pelo link público.
