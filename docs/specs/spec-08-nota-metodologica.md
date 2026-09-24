# SPEC-08: Nota metodológica

## Critério de aceite principal

Toda tela exibe fonte, tabela SIDRA e data de atualização.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Nota metodológica
  Cenário: Fonte visível
    Dado qualquer tela de dados do painel
    Então vejo a fonte IBGE, a tabela SIDRA e a data da última carga
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
