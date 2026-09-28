# ADR 0021: Deploy automático no `dt-server` via webhook do GitHub

Status: Aceita

## Contexto

A demo dependia do notebook de um desenvolvedor (ADR 0010, decisão 15 do plano): suspensão, reinício ou perda de rede derrubavam o link (ver "A demo depende do notebook" em `docs/erros-conhecidos/dificuldades.md`). Publicar uma mudança também exigia acessar a máquina manualmente para dar `git pull` e `docker compose up -d --build`.

## Opções

- **Escolhida:** Listener HTTP próprio (stdlib Python) recebendo o webhook de `push` do GitHub, validando a assinatura HMAC e disparando `infra/deploy.sh`
- **Descartadas:** CI/CD hospedado (GitHub Actions com runner self-hosted, ou serviço externo tipo Render/Railway) — infra própria (`dt-server`) já está sempre ligada e na tailnet, sem custo extra; GitHub Actions self-hosted runner é mais pesado para o que é só `git pull` + `docker compose up`

## Decisão

`infra/webhook_listener.py` roda como serviço systemd (`faperon-webhook`, ver `infra/faperon-webhook.service`), escutando só em `127.0.0.1:9001`. O Tailscale Funnel expõe essa porta publicamente em `:10000` (Funnel só aceita 443, 8443 ou 10000; 443 é o site e 8443 já está em uso por outro serviço no `dt-server`).

No evento `push` em `main`, o listener valida `X-Hub-Signature-256` contra `GITHUB_WEBHOOK_SECRET` e roda `infra/deploy.sh` em background (`subprocess.Popen`, resposta `202` imediata). O script usa `flock` para não rodar dois deploys ao mesmo tempo, só reconstrói se houver commit novo em `origin/main`, e registra cada execução em `infra/deploy.log`.

Corpo da requisição limitado a 5 MB antes da leitura, para não deixar uma requisição com `Content-Length` arbitrário esgotar memória do listener exposto publicamente.

Instalação e operação documentadas em `infra/demo-checklist.md`.

## Consequências

Publicar uma mudança passa a ser só `git push`; o servidor atualiza sozinho, sem acesso manual. Como o `dt-server` já fica sempre ligado, a queda por suspensão do notebook deixa de afetar a demo (ela passa a rodar lá, não mais no notebook — ver atualização em `docs/erros-conhecidos/dificuldades.md`). Custo: mais uma porta pública exposta pelo Funnel e mais um processo para monitorar (`systemctl status faperon-webhook`).
