# ADR 0011: Tipos TS gerados do OpenAPI do Django

Status: Aceita

## Contexto

Tipos escritos à mão divergem da API sem aviso.

## Opções

- **Escolhida:** Tipos TS gerados do OpenAPI do Django
- **Descartadas:** Tipos manuais

## Decisão

O Django gera o OpenAPI com drf-spectacular e `npm run gen:api` gera os tipos TS.

Motivo: Front quebra no build se a API mudar.

## Consequências

Mudança de contrato quebra o build do front. Custo: regenerar tipos a cada mudança.
