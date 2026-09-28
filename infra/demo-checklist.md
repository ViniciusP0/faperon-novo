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

Validação ponta a ponta (2026-09-28): os commits de teste anteriores foram feitos e empurrados a partir do próprio `dt-server`, então `deploy.sh` sempre encontrou `HEAD` já igual a `origin/main` (log só mostra `already up to date`, nunca `new commits found, deploying`). Este commit foi feito e empurrado de uma máquina diferente do `dt-server` para exercitar de fato o caminho de rebuild.

# Checklist de demo (notebook)

Antes de cada apresentação:

1. Notebook na tomada e sem suspensão nem hibernação, inclusive com a tampa fechada. Num terminal como administrador:
   ```powershell
   powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
   powercfg /change standby-timeout-ac 0
   powercfg /change hibernate-timeout-ac 0
   powercfg /setactive SCHEME_CURRENT
   ```
   Não usar "Suspender" no menu Iniciar. Na bateria o esquema atual suspende após 10 min e hiberna após 3 h, então o link cai. Conferir com `powercfg /q SCHEME_CURRENT SUB_SLEEP`.
2. Conferir rede e que o Tailscale está conectado (`tailscale status`).
3. `docker compose up -d` e aguardar `docker compose ps` mostrar `api` como `healthy`.
4. Se o banco estiver vazio ou desatualizado: `make seed` (não depende do IBGE).
5. Publicar o link: `make funnel` (ou `infra/funnel.ps1 -Up`). Anotar a URL `https://<maquina>.<tailnet>.ts.net`.
6. Abrir a URL fora da rede local (celular em dados móveis, sem Tailscale). No notebook o nome resolve para a tailnet, então o teste local não vale: use `curl --resolve <nome>:<porta>:<IP público de entrada> ...` (veja `docs/erros-conhecidos/dificuldades.md`) ou o celular e percorrer Início -> Central -> Painel -> PDF.
7. Confirmar que `https://<url>/api/schema/` e `https://<url>/admin/` **não** abrem pelo Funnel (respondem 404).
8. Depois da demo: `make funnel-off`.

Notas:

- Containers usam `restart: unless-stopped`; o Docker Desktop e o Tailscale devem iniciar com o Windows.
- Para saber se o link caiu enquanto ninguém olhava, use um monitor de disponibilidade externo (por exemplo, UptimeRobot) na URL `:8443`. Para ver as suspensões dos últimos dias: `Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Power-Troubleshooter'; Id=1}` (mostra hora de dormir e de acordar).
- O `scheduler` roda a ingestão ao subir se a última carga tiver mais de 3 dias.
- O Postgres não publica porta no host.
- Se a porta 443 do Funnel já estiver em uso por outro app (`tailscale funnel status`), publique em outra porta sem derrubá-lo: `tailscale funnel --bg --https=8443 3000` (URL termina em `:8443`) e desligue com `tailscale funnel --https=8443 off`.
- O proxy do Next só encaminha `/api/v1/`; `/api/schema/`, `/api/docs/` e `/admin/` respondem 404 pelo link público.
