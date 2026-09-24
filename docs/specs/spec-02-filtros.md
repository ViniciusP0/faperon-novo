# SPEC-02: Filtros

## Critério de aceite principal

Segmento → Produto (busca por nome) → Indicador → Ano inicial/final; opções vêm da API; filtros ficam na URL e o link reproduz a consulta.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Filtros do painel
  Cenário: Link reproduz a consulta
    Dado que escolhi Segmento "Agricultura", Produto "Soja", Indicador "Quantidade produzida" e período 2015–2024
    Quando copio o link e o abro em outra aba
    Então o painel exibe os mesmos filtros e o mesmo resultado
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
