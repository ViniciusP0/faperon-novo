# SPEC-05: Comparação

## Critério de aceite principal

Até 5 municípios (ou produtos, mesmo indicador e unidade) em colunas agrupadas; bloqueia comparar unidades diferentes.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Comparação
  Cenário: Unidades diferentes são bloqueadas
    Dado que escolhi comparar os produtos "Soja" e "Leite" no mesmo indicador
    Quando as unidades dos produtos diferem
    Então a comparação é bloqueada com uma mensagem explicando o motivo
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
