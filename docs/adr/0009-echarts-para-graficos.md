# ADR 0009: ECharts para gráficos

Status: Aceita

## Contexto

O painel precisa de colunas, colunas agrupadas, SVG e, na Fase 3, mapa coroplético.

## Opções

- **Escolhida:** ECharts para gráficos
- **Descartadas:** Recharts, Chart.js

## Decisão

Usar Apache ECharts (import modular) no front.

Motivo: Colunas agrupadas, SVG, mapas na fase 3.

## Consequências

Cobre os gráficos das Specs e o mapa futuro. Custo: bundle maior, mitigado por import modular.
