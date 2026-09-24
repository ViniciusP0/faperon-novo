# ADR 0006: Ingestão via API SIDRA a cada 3 dias, com staging, hash e cargas versionadas

Status: Aceita

## Contexto

O IBGE publica uma vez por ano; a ingestão precisa ser automática, auditável e idempotente.

## Opções

- **Escolhida:** Ingestão via API SIDRA a cada 3 dias, com staging, hash e cargas versionadas
- **Descartadas:** Download manual de CSV, carga única

## Decisão

Ingestão pela API de agregados v3 (tabelas 5457, 3939 e 74), um produto por consulta, com hash da resposta e registro em `carga`. Rodar a mesma Carga duas vezes produz o mesmo estado; falha mantém os dados anteriores.

Motivo: Automação, auditoria e reprocessamento.

## Consequências

Dados sempre rastreáveis a uma Carga. Custo: código da ACL e testes com respostas reais gravadas.
