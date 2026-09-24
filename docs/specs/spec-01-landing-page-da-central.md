# SPEC-01: Landing page da Central

## Critério de aceite principal

Página editada no Wagtail com chamada para o painel; Lighthouse ≥ 90 em Performance, SEO e Acessibilidade.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Landing page da Central de Inteligência
  Cenário: Editor publica a landing
    Dado que a página da Central foi editada no Wagtail
    Quando um visitante abre "/central-de-inteligencia"
    Então vê o título, os blocos de apresentação e o botão para o Painel
    E a página atinge Lighthouse ≥ 90 em Performance, SEO e Acessibilidade
```

O texto acima é o primeiro teste que falha (TDD): vira teste de domínio, de API ou E2E conforme a camada.
