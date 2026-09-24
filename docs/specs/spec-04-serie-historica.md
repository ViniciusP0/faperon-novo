# SPEC-04: Série histórica

## Critério de aceite principal

Gráfico de colunas por ano no período; total de RO ou município escolhido; tooltip com valor e unidade.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Série histórica
  Cenário: Total de Rondônia
    Dado que escolhi Soja, Quantidade produzida e período 2015–2024
    Quando abro a série histórica sem escolher município
    Então vejo uma coluna por ano com o total de Rondônia
    E o tooltip mostra o valor e a unidade
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
