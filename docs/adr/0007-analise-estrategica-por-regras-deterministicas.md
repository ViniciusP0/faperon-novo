# ADR 0007: Análise estratégica por regras determinísticas

Status: Aceita

## Contexto

O texto da análise vira informação publicada pela FAPERON e não pode variar entre execuções.

## Opções

- **Escolhida:** Análise estratégica por regras determinísticas
- **Descartadas:** LLM

## Decisão

Gerar a análise por template e regras (variação, CAGR, maior e menor ano, top 5, concentração), sem IA.

Motivo: Reprodutível e auditável.

## Consequências

Texto testável e auditável. Custo: menos flexibilidade de linguagem.
