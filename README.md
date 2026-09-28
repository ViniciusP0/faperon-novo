# FAPERON — Novo site e Central de Inteligência Agropecuária

Protótipo evolutivo: Início, Central de Inteligência e Painel Agro Analítico RO. Monorepo com Next.js (`apps/web`) e Django (`apps/api`). Plano completo em `Plano FAPERON.md`.

## Rodar

Requisitos: Docker Desktop (Node 24 só para desenvolver o front).

```bash
cp .env.example .env      # ajuste segredos
docker compose up -d --build
```

Depois de `api` ficar `healthy`:

- Site: http://localhost:3000 (Início), `/central-de-inteligencia`, `/painel`
- OpenAPI (só no seu computador, não pelo link público): http://localhost:8000/api/docs/

Com `make` (ou copie os comandos do `Makefile` no Windows): `make up`, `make seed`, `make test`, `make lint`, `make funnel`.

## Dados

- `make ingest` busca as tabelas SIDRA 5457, 3939 e 74 (o `scheduler` repete a cada 3 dias).
- `make seed` carrega o snapshot versionado em `data/seed/` sem acessar o IBGE.
- `make snapshot` gera um novo snapshot depois de uma carga completa.

## Estrutura

```
apps/web    Next.js (site, painel e conteúdo editorial em src/content)
apps/api    Django (ingestão, indicadores, análise/PDF)
docs/       ADRs (docs/adr), Specs (docs/specs), contrato da API, erros conhecidos (docs/erros-conhecidos)
data/seed/  Snapshot do banco
infra/      Funnel/serve do Tailscale, checklist de demo
```

Contrato entre front e back: `docs/api-contract.md`. Decisões: `docs/adr/`. Critérios de aceite: `docs/specs/`.

## Demo pelo Tailscale

Ver `infra/demo-checklist.md`. O Funnel expõe a porta 3000 (Next.js) e, para o deploy automático, a 9001 (webhook) em `:8444`.

## Deploy automático

O `dt-server` atualiza sozinho a cada `git push` em `main`: um serviço systemd (`faperon-webhook`, ver `infra/faperon-webhook.service`) recebe o webhook do GitHub, valida a assinatura HMAC e roda `infra/deploy.sh` (`git reset --hard origin/main` + `docker compose up -d --build`). Não precisa mais acessar o servidor manualmente para publicar uma mudança.

- Status do serviço: `systemctl status faperon-webhook`
- Log de deploy: `infra/deploy.log` ou `journalctl -u faperon-webhook -f`
- Segredo compartilhado com o GitHub: `GITHUB_WEBHOOK_SECRET` no `.env` (configurar o mesmo valor em Settings > Webhooks no GitHub)
- Detalhes de instalação (unit systemd, Funnel na porta 8444): `infra/demo-checklist.md`
