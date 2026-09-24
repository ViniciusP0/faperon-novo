# ADR 0003: Monorepo com `apps/web` (Next.js) e `apps/api` (Django)

Status: Aceita

## Contexto

Front e back evoluem juntos e compartilham o contrato da API.

## Opções

- **Escolhida:** Monorepo com `apps/web` (Next.js) e `apps/api` (Django)
- **Descartadas:** Dois repositórios

## Decisão

Um repositório com `apps/web`, `apps/api`, `docs/`, `data/seed/` e `infra/`.

Motivo: Contrato da API e CI num lugar só.

## Consequências

Mudança de contrato e consumo entram no mesmo PR. Custo: CI precisa rodar os dois lados.
