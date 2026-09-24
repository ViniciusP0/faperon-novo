# ADR 0017: Snapshot do banco versionado em `data/seed/`

Status: Aceita

## Contexto

A demo não pode depender da API do IBGE no momento da apresentação.

## Opções

- **Escolhida:** Snapshot do banco versionado em `data/seed/`
- **Descartadas:** Depender da API na demo

## Decisão

`make snapshot` gera um dump versionado em `data/seed/` e `make seed` o carrega sem acessar o IBGE.

Motivo: Demo reproduzível em qualquer máquina.

## Consequências

Demo reproduzível. Custo: arquivo compactado no repositório a cada atualização relevante.
