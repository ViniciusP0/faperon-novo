# Erros conhecidos e dificuldades

Esta pasta registra os problemas que já apareceram no projeto, o que os causou e como foram resolvidos ou contornados. O objetivo é que ninguém gaste tempo descobrindo de novo o mesmo problema.

| Arquivo | Conteúdo |
| --- | --- |
| [dificuldades.md](dificuldades.md) | Dificuldades enfrentadas na elaboração do projeto até agora, por área, com sintoma, causa, solução e status. |
| [em-aberto.md](em-aberto.md) | O que ainda não está resolvido: limitações, dívidas técnicas e itens que dependem de decisão ou confirmação do cliente. |

## Status usados

- **Resolvido:** a causa foi corrigida no código ou na configuração.
- **Contornado:** existe um jeito confiável de seguir em frente, mas a causa continua (por exemplo, uma limitação do ambiente).
- **Em aberto:** ainda precisa de ação; está listado em [em-aberto.md](em-aberto.md).

## Como registrar um novo problema

Acrescente uma entrada em `dificuldades.md`, na área certa, com estes campos:

- **Sintoma:** o que a pessoa vê (inclua a mensagem de erro exata quando for curta).
- **Causa:** por que acontece.
- **Solução ou contorno:** o que foi feito, com o comando ou o arquivo.
- **Status:** resolvido, contornado ou em aberto.

Se uma decisão de arquitetura resultar do problema, crie ou atualize uma ADR em `docs/adr/` e cite o número na entrada.
