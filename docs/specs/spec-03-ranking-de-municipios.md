# SPEC-03: Ranking de municípios

## Critério de aceite principal

Lista os 52 municípios ordenados do maior para o menor valor no ano final do período; sigiloso aparece como "X" no fim; mostra posição, valor, unidade e % do total estadual.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Ranking de municípios
  Cenário: Ordenar pelo indicador escolhido
    Dado que existem medições de "Quantidade produzida" de "Soja" em 2024
    Quando eu consulto o ranking de Soja, Quantidade produzida, 2024–2024
    Então os municípios aparecem em ordem decrescente de valor
    E municípios com valor sigiloso aparecem ao final marcados com "X"
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
