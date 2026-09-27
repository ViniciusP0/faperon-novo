# SPEC-07: Relatório PDF

## Critério de aceite principal

Botão gera PDF com filtros, gráfico, ranking, análise, gráfico com a linha de tendência linear, fonte IBGE e data da carga; < 10 s para o caso típico; mesmo recorte = mesmo PDF (cache).

## Gherkin

```gherkin
# language: pt
Funcionalidade: Relatório PDF
  Cenário: Gerar relatório do recorte
    Dado que estou no painel com um recorte válido
    Quando clico em "Gerar PDF"
    Então recebo um PDF com filtros, gráfico, ranking, análise, fonte IBGE e data da carga em menos de 10 segundos
    E o mesmo recorte devolve o mesmo arquivo
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
