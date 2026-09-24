# ADR 0013: Protótipo evolutivo com operação enxuta: sem Celery/Redis, agendamento por container `scheduler`, PDF síncrono

Status: Aceita

## Contexto

O prazo do protótipo é de 4 semanas e a carga é pequena.

## Opções

- **Escolhida:** Protótipo evolutivo com operação enxuta: sem Celery/Redis, agendamento por container `scheduler`, PDF síncrono
- **Descartadas:** Stack completa já; mockup descartável

## Decisão

Container `scheduler` roda a ingestão a cada 3 dias; sem cache Redis (views materializadas bastam); PDF gerado na requisição.

Motivo: Demonstra rápido sem jogar código fora.

## Consequências

Menos peças móveis agora. Custo: Celery, Redis e PDF assíncrono entram na Fase 2 se a carga pedir.
