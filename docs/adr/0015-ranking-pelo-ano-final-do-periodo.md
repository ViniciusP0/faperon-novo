# ADR 0015: Ranking pelo ano final do período

Status: Aceita

## Contexto

Somar ou tirar média entre anos exige regra por indicador e induz erro (ex.: rendimento médio).

## Opções

- **Escolhida:** Ranking pelo ano final do período
- **Descartadas:** Soma/média do período

## Decisão

O ranking usa sempre o ano final do período. O período vale para a série histórica e a comparação.

Motivo: Simples de explicar; sem regra de agregação por indicador.

## Consequências

Sem agregação entre anos. Custo: o ranking não resume o período inteiro.
