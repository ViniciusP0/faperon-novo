# FAPERON — Novo site e Central de Inteligência Agropecuária

Protótipo evolutivo: Início, Central de Inteligência e Painel Agro Analítico RO. Monorepo com Next.js (`apps/web`) e Django (`apps/api`). Plano completo em `docs/Plano FAPERON.md`.

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

## Zétele (assistente do site)

O Zétele fica no canto inferior direito do Início e da Central (ADR 0029). No Início ele só orienta; na Central consulta os dados do IBGE e fala de valor da produção e preço médio.

- Para responder com IA, crie `.env.local` na raiz com `ANTHROPIC_API_KEY=...` (fora do git; só o container `api` lê). Sem a chave, ele responde só às perguntas prontas.
- `make test` não chama a Anthropic. As perguntas de ouro (30 casos, API real) rodam com `docker compose run --rm --entrypoint "" -v "$PWD/apps/api:/app" -v "$PWD/data:/app/data" api-dev pytest -m llm -s`.
- `docker compose exec api python manage.py zetele_exportar --dias 90` exporta as perguntas (anônimas, 90 dias) em CSV para montar o FAQ.

## Boletim do Agro

Diariamente o `scheduler` lê o Diário Oficial da União e o de Rondônia, separa os atos do agro e resume os relevantes com IA. Vem desligado.

A tela fica em `/sistema/boletim` (depois de "Relatórios") e só aparece para coordenação e gestão; a decisão está na [ADR 0035](docs/adr/0035-boletim-do-agro-coleta-diaria-dos-diarios-oficiais-com-ia.md).

- `BOLETIM_ATIVO=1` no `.env.local` liga (nos servidores AWS, no `.env` da máquina). Usa a `ANTHROPIC_API_KEY` do Zétele; não há teto de gasto, o consumo por dia fica no modelo `ConsumoDia` (tabela `boletim_consumo_dia`). Nos servidores, mudança no `.env` vale na próxima rodada do `faperon-atualizar` (cerca de 2 minutos), sem reiniciar na mão.
- Rodar uma vez, na mão: `docker compose exec scheduler python manage.py coletar_boletim [--dia AAAA-MM-DD] [--fonte dou|doe]`.
- Calibração (API real, fixtures de 19 e 20/10/2026; imprime os resumos e o consumo): `docker compose run --rm --entrypoint "" -v "$PWD/apps/api:/app" -v "$PWD/data:/app/data" api-dev pytest -m llm tests/test_boletim_ouro.py -s`. Sem a chave, o teste é pulado.
- Pendente: a calibração ainda não rodou contra a API real (faltava a chave). Até rodar e ajustar o prompt de `classificador.py`, mantenha `BOLETIM_ATIVO=0`.

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

Ver `infra/demo-checklist.md`. O Funnel expõe a porta 3000 (Next.js) e, para o deploy automático, a 9001 (webhook) em `:10000`.

## Deploy automático

A `vinicin` atualiza sozinha a cada `git push` em `main` (o `dt-server` está offline; ADR 0021). O serviço `webhook` do compose recebe o webhook do GitHub, valida a assinatura HMAC e cria `infra/.deploy-pendente`; a tarefa agendada `faperon-deploy` roda `infra/deploy.ps1` a cada minuto (`git merge --ff-only` + `docker compose up -d --build`). Se houver alteração local não commitada ou commit não enviado, o deploy é abortado e registrado no log, sem alterar nada.

- Status do serviço: `docker compose ps webhook`
- Log de deploy: `infra/deploy.log`
- Segredo compartilhado com o GitHub: `GITHUB_WEBHOOK_SECRET` no `.env` (configurar o mesmo valor em Settings > Webhooks no GitHub)
- Detalhes de instalação (tarefa agendada, Funnel na porta 10000): `infra/demo-checklist.md`
