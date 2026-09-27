# SPEC-04: Série histórica

## Critério de aceite principal

Gráfico de colunas por ano no período; total de RO ou município escolhido; tooltip com valor e unidade; linha tracejada de tendência linear sobre as colunas, calculada por mínimos quadrados só com os anos que têm dado (anos sigilosos ou ausentes nunca entram como zero), com legenda, texto (variação média por ano e R²) e coluna na tabela alternativa.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Série histórica
  Cenário: Total de Rondônia
    Dado que escolhi Soja, Quantidade produzida e período 2015–2024
    Quando abro a série histórica sem escolher município
    Então vejo uma coluna por ano com o total de Rondônia
    E o tooltip mostra o valor e a unidade

  Cenário: Linha de tendência
    Dado que a série tem dois ou mais anos com dado
    Quando abro a série histórica
    Então vejo uma linha tracejada de "Tendência linear" sobre as colunas
    E leio o crescimento ou a queda média por ano e o R² em texto
    E anos sem dado não puxam a linha para zero
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
