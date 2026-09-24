# ADR 0014: Acesso externo por Tailscale Funnel aberto; só o Next.js exposto; admin via tailnet

Status: Aceita

## Contexto

A FAPERON precisa abrir o protótipo por link, sem instalar nada.

## Opções

- **Escolhida:** Acesso externo por Tailscale Funnel aberto; só o Next.js exposto; admin via tailnet
- **Descartadas:** Funnel com senha; convite na tailnet

## Decisão

Funnel expõe só o Next.js (porta 3000). O Django fica atrás do proxy `/api` e o admin do Wagtail só por `tailscale serve` na tailnet. Postgres sem porta publicada.

Motivo: Quem recebe o link abre sem instalar nada.

## Consequências

Demo simples e superfície mínima. Custo: link depende do notebook ligado; rate limit no PDF.
