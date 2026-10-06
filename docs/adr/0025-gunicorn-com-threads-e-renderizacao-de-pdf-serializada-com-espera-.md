# ADR 0025: Gunicorn com threads e renderização de PDF serializada com espera limitada

Status: Aceita

## Contexto

O PDF é gerado de forma síncrona no servidor ([0008](0008-pdf-no-servidor-com-weasyprint.md), [0013](0013-prototipo-evolutivo-com-operacao-enxuta-sem-celery-redis-age.md)). A API rodava com 3 workers síncronos do Gunicorn; três PDFs lentos ao mesmo tempo ocupavam todos eles, e o resto da API, o proxy do Next e o healthcheck `/saude` ficavam sem resposta. Os PDFs também eram guardados no Postgres sem limite.

## Opções

- **Escolhida:** workers `gthread` (processos com várias threads), renderização do WeasyPrint serializada por processo e com espera limitada, e cache de PDFs com limpeza e teto.
- **Descartadas:** mais workers síncronos (mais memória e o mesmo problema sob carga); fila externa com Celery e Redis (já descartada em 0013 para este protótipo); renderizar em subprocesso com timeout próprio (resolveria o travamento de verdade, mas é complexidade que o tráfego atual não pede).

## Decisão

- `entrypoint.sh` sobe o Gunicorn com `--worker-class gthread`, configurável por ambiente: `GUNICORN_WORKERS` (padrão 3), `GUNICORN_THREADS` (padrão 4) e `GUNICORN_TIMEOUT` (padrão 60 segundos, antes 120). Com 3 × 4 threads, o pico é de 12 conexões ao Postgres.
- `analise.pdf.renderizar` usa um `threading.Lock` por processo: o Pango e o fontconfig não são confiáveis em renderizações simultâneas. Só a chamada ao WeasyPrint fica sob o lock; leitura do cache e consultas ficam fora, e as outras threads seguem atendendo API e `/saude`.
- A espera pelo lock é limitada a 30 segundos (`ESPERA_RENDERIZACAO`). Passado esse tempo o pedido responde `503` no formato `{"erro", "campos"}` com `Retry-After: 30`, em vez de empilhar. No `gthread`, o `--timeout` só vigia o laço principal do worker e não mata uma thread presa; sem a espera limitada, uma renderização travada prenderia todas as threads daquele worker.
- Cada recorte de PDF é validado e normalizado antes de virar chave de cache (comparação de 2 a 5 municípios, existentes, sem repetição e em ordem fixa). A cada carga de dados concluída os PDFs da versão anterior são apagados, e cada versão guarda no máximo 200 PDFs (`MAX_RELATORIOS`).

## Consequências

- Uma renderização que trave de verdade continua presa naquela thread até o container reiniciar. O efeito agora é limitado: os pedidos de PDF desse worker respondem 503 depois de 30 segundos, e o resto da API continua de pé. Se isso acontecer na prática, o próximo passo é renderizar em subprocesso com timeout.
- Dois PDFs nunca renderizam ao mesmo tempo no mesmo processo; sob pico, o segundo espera até 30 segundos pelo primeiro.
- A mudança do timeout de 120 para 60 segundos vale para pedidos comuns; renderizações longas dependem do limite de 30 segundos de espera, não do timeout do Gunicorn.
