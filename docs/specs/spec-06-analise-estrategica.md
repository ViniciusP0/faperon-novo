# SPEC-06: Análise estratégica

## Critério de aceite principal

Texto gerado por regras: variação no período, CAGR, maior e menor ano, top 5 municípios, concentração (participação do top 5).

## Gherkin

```gherkin
# language: pt
Funcionalidade: Análise estratégica
  Cenário: Texto determinístico
    Dado um recorte com série e ranking completos
    Quando a análise é gerada duas vezes
    Então o texto é idêntico
    E menciona variação, CAGR, maior e menor ano, top 5 e concentração
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
