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

## Atualização (2026-10-07): valores que a fonte deixou de publicar

O upsert só insere e atualiza; sozinho, um valor que o IBGE passou a publicar como "-" continuaria no fato com o número antigo. Por isso, numa carga **completa** (sem `apenas`), na mesma transação do upsert, os fatos da tabela cuja chave (produto, indicador, município, ano) não veio no staging são apagados. Salvaguarda: só apaga se o staging tiver ao menos 90% das linhas que a tabela já tinha; abaixo disso a carga segue (não falha), registra um aviso com os números e não apaga nada, porque uma resposta muito menor costuma ser fonte incompleta, não revisão. A carga parcial nunca apaga, e dados de outras tabelas nunca são tocados.
