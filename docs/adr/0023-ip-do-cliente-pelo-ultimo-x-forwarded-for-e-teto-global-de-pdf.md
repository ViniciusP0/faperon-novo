# ADR 0023: IP do cliente pelo último X-Forwarded-For e teto global de PDF

Status: Aceita

## Contexto

O endpoint do PDF tem limite por IP (10 por minuto) porque a geração é cara ([0008](0008-pdf-no-servidor-com-weasyprint.md), [0013](0013-prototipo-evolutivo-com-operacao-enxuta-sem-celery-redis-age.md)). Auditoria de 06/10/2026: o proxy do Next repassava ao Django o `X-Forwarded-For` que o próprio visitante enviava, e o Django (`NUM_PROXIES=1`) usa o último item dessa lista como identidade. Bastava trocar o header a cada pedido para nunca atingir o limite. A porta 3000 também estava publicada em todas as interfaces, o que permitia o mesmo truque sem passar pelo Funnel ([0014](0014-acesso-externo-por-tailscale-funnel-aberto-so-o-next-js-expo.md)).

## Opções

- **Escolhida:** confiar só no último item do `X-Forwarded-For`, que o Tailscale Funnel (o único proxy confiável na frente do Next) acrescenta com o IP real; prender a porta 3000 a `127.0.0.1`; somar um teto global como rede de segurança.
- **Descartadas:** aumentar `NUM_PROXIES` (o Funnel acrescenta um item só, então a conta continuaria dependendo do que o cliente mandou à esquerda); autenticar o PDF (o acesso é público de propósito); remover o limite por IP e ficar só com o teto global (um visitante barraria todos).

## Decisão

- `apps/web/src/lib/proxy.ts` repassa ao Django apenas o último item não vazio do `X-Forwarded-For` (`ipDoCliente`). Sem o header, nada é repassado e o Django enxerga o IP do container web.
- `docker-compose.yml` publica o `web` em `127.0.0.1:3000`; o Funnel (`tailscale funnel --bg 3000`) alcança a porta pelo loopback do host.
- Além do limite por IP (`PDF_RATE_LIMIT`, padrão `10/min`), `PdfGlobalThrottle` limita todos os visitantes juntos (`PDF_GLOBAL_RATE_LIMIT`, padrão `30/min`). A view para no primeiro limite que recusa, então um pedido barrado por IP não gasta o teto global. Sem isso, um único IP real esgotaria o teto de todos.
- A premissa de que o Funnel acrescenta o IP real foi conferida em produção em 06/10/2026: 12 PDFs com `X-Forwarded-For` forjado diferente a cada pedido deram 10 respostas 200 e 2 respostas 429.

## Consequências

- Quem acessava o site direto pela porta 3000 de outra máquina da rede local perde esse caminho; use a URL do Funnel ou `tailscale serve`.
- Se uma mudança de infraestrutura trocar o Funnel por outro proxy, a premissa precisa ser revalidada (repetir o teste dos 12 pedidos); até lá só o teto global protege o endpoint.
- O teto global é um limite de capacidade, não de justiça: sob ataque distribuído ele barra também visitantes legítimos.
