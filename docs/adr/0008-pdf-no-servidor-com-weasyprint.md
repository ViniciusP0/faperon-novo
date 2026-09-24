# ADR 0008: PDF no servidor com WeasyPrint

Status: Aceita

## Contexto

O relatório precisa ter o mesmo layout em qualquer máquina e ser cacheável por recorte.

## Opções

- **Escolhida:** PDF no servidor com WeasyPrint
- **Descartadas:** Puppeteer, PDF no navegador

## Decisão

Gerar o PDF no Django com WeasyPrint, a partir de HTML e SVG.

Motivo: Mesmo layout sempre; stack Python.

## Consequências

Layout consistente e teste de regressão visual. Custo: dependências de sistema no container.
