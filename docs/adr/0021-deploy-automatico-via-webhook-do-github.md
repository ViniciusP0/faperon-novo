# ADR 0021: Deploy automático via webhook do GitHub

Status: Aceita

## Contexto

A demo dependia do notebook de um desenvolvedor (ADR 0010, decisão 15 do plano): suspensão, reinício ou perda de rede derrubavam o link (ver "A demo depende do notebook" em `docs/erros-conhecidos/dificuldades.md`). Publicar uma mudança também exigia acessar a máquina manualmente para dar `git pull` e `docker compose up -d --build`.

## Opções

- **Escolhida:** Listener HTTP próprio (stdlib Python) recebendo o webhook de `push` do GitHub, validando a assinatura HMAC e disparando `infra/deploy.sh`
- **Descartadas:** CI/CD hospedado (GitHub Actions com runner self-hosted, ou serviço externo tipo Render/Railway) — infra própria (`dt-server`) já está sempre ligada e na tailnet, sem custo extra; GitHub Actions self-hosted runner é mais pesado para o que é só `git pull` + `docker compose up`

## Decisão

`infra/webhook_listener.py` roda como serviço systemd (`faperon-webhook`, ver `infra/faperon-webhook.service`), escutando só em `127.0.0.1:9001`. O Tailscale Funnel expõe essa porta publicamente em `:10000` (Funnel só aceita 443, 8443 ou 10000; 443 é o site e 8443 já está em uso por outro serviço no `dt-server`).

No evento `push` em `main`, o listener valida `X-Hub-Signature-256` contra `GITHUB_WEBHOOK_SECRET` e roda `infra/deploy.sh` em background (`subprocess.Popen`, resposta `202` imediata). O script usa `flock -w 1800`: um push que chega durante um deploy espera ele terminar e então publica o próprio commit (atualizado em 06/10/2026; antes era `flock -n`, que descartava esse push), só reconstrói se houver commit novo em `origin/main`, e registra cada execução em `infra/deploy.log`.

Limites contra abuso, já que a porta é pública: corpo da requisição de no máximo 1 MB, checado antes da leitura (um push do GitHub tem poucos KB; antes o teto era 5 MB); timeout de socket de 10 s por conexão, que corta cliente lento; e no máximo 8 conexões simultâneas, com 503 para o excedente. Sem isso, algumas conexões abertas e paradas esgotavam threads e memória do `dt-server`, que também roda a demo, e o deploy automático parava. Os testes estão em `infra/test_webhook_listener.py` (`python -m unittest discover -s infra`).

Instalação e operação documentadas em `infra/demo-checklist.md`.

## Consequências

Publicar uma mudança passa a ser só `git push`; o servidor atualiza sozinho, sem acesso manual. Como o `dt-server` já fica sempre ligado, a queda por suspensão do notebook deixa de afetar a demo (ela passa a rodar lá, não mais no notebook — ver atualização em `docs/erros-conhecidos/dificuldades.md`). Custo: mais uma porta pública exposta pelo Funnel e mais um processo para monitorar (`systemctl status faperon-webhook`).

## Atualização de 15/10/2026: deploy na `vinicin` (Windows) enquanto o `dt-server` está fora

O `dt-server` ficou offline e o site passou a rodar na `vinicin`, o PC Windows de desenvolvimento (`https://vinicin.tail3fe9ce.ts.net:8443`). A decisão acima (listener que dispara `deploy.sh`) não serve lá: não há systemd, `flock` nem Python no host. O `dt-server` continua descrito acima e pode voltar a ser o alvo; `webhook_listener.py` mantém o modo antigo (`DEPLOY_MODE=script`, o padrão).

Na `vinicin`:

- **Listener em container.** O serviço `webhook` do `docker-compose.yml` (`python:3.12-slim`, rootfs somente leitura, sem capabilities, `restart: always`) roda `webhook_listener.py` em `DEPLOY_MODE=gatilho` e escuta em `0.0.0.0:9001` dentro do container, publicado só em `127.0.0.1:9001`. O Funnel expõe `:10000` -> `9001`. O container não tem acesso ao Docker nem ao Git do host: ao receber um push em `main` com assinatura válida, apenas cria `infra/.deploy-pendente` e responde `202`.
- **Deploy no host.** `infra/deploy.ps1`, chamado a cada minuto por uma tarefa agendada do Windows, consome o gatilho, faz `git fetch`, `git merge --ff-only origin/main` e `docker compose up -d --build`. A tarefa não roda em paralelo consigo mesma (`MultipleInstances IgnoreNew`); um push durante o build deixa o gatilho no disco e é publicado no minuto seguinte, o equivalente ao `flock -w` do `deploy.sh`.
- **Sem `reset --hard`.** Como a `vinicin` é também o repositório de desenvolvimento, o deploy **não** descarta nada: se houver alteração não commitada ou commit local não enviado, `deploy.ps1` registra o motivo em `infra/deploy.log` e não altera nada. Deploy automático só acontece com a árvore limpa e sincronizada.
- **Latência e requisitos.** O deploy começa em até 1 minuto após o push, e só enquanto o usuário está logado e o Docker Desktop está de pé.
- **Segredo.** `GITHUB_WEBHOOK_SECRET` no `.env`; o serviço `webhook` não aceita requisições sem ele. O mesmo valor está no webhook do GitHub, cuja URL agora é `https://vinicin.tail3fe9ce.ts.net:10000/webhook`.

Consequência: a `vinicin` não é um servidor sempre ligado; suspensão, reinício ou Docker Desktop fechado derrubam o site e o deploy, o mesmo risco do notebook que a decisão original queria evitar.
