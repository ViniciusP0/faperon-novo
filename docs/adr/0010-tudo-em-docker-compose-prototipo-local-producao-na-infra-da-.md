# ADR 0010: Tudo em Docker Compose; protótipo local, produção na infra da FAPERON

Status: Aceita

## Contexto

O protótipo roda no notebook de um dev e depois muda para a infraestrutura da FAPERON.

## Opções

- **Escolhida:** Tudo em Docker Compose; protótipo local, produção na infra da FAPERON
- **Descartadas:** PaaS

## Decisão

Todos os serviços em containers definidos em um `docker-compose.yml`.

Motivo: Mesma definição de ambiente nos dois lugares.

## Consequências

Troca de máquina sem retrabalho. Custo: Docker obrigatório para desenvolver o back-end.
