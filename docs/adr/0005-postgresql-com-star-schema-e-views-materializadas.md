# ADR 0005: PostgreSQL com star schema e views materializadas

Status: Aceita

## Contexto

O volume de dados do IBGE para Rondônia é pequeno e as consultas são de ranking e série por recorte.

## Opções

- **Escolhida:** PostgreSQL com star schema e views materializadas
- **Descartadas:** Data warehouse, NoSQL

## Decisão

Modelo de leitura em star schema (dimensões e fato de medição) no PostgreSQL 16, com view materializada de ranking.

Motivo: Volume pequeno cabe no Postgres.

## Consequências

Consultas rápidas sem infraestrutura extra. Custo: refresh da view após cada carga.
