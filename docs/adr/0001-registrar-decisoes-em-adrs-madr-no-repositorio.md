# ADR 0001: Registrar decisões em ADRs (MADR) no repositório

Status: Aceita

## Contexto

Decisões de arquitetura ficavam apenas em conversas e documentos soltos, sem histórico ligado ao código.

## Opções

- **Escolhida:** Registrar decisões em ADRs (MADR) no repositório
- **Descartadas:** Wiki, Confluence

## Decisão

Toda decisão relevante vira um arquivo em `docs/adr/NNNN-titulo.md` no formato MADR. Decisão aceita não é editada: uma nova ADR a substitui.

Motivo: Decisão versionada junto do código.

## Consequências

Rastreabilidade das decisões e revisão por PR. Custo: disciplina de escrever a ADR antes de mudar a arquitetura.
