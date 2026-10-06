# ADR 0024: Imagem da API em dois estágios; produção sem root e sem ferramentas de dev

Status: Aceita

## Contexto

A imagem da API instalava `requirements-dev.txt` (pytest, hypothesis, ruff, mypy e stubs) e rodava como root, igual em desenvolvimento e produção. Auditoria de 06/10/2026: qualquer falha de execução de código na API ou no WeasyPrint rodaria como root, num container com `./data` montado para escrita e `DJANGO_SECRET_KEY` e `POSTGRES_PASSWORD` no ambiente. O compose é a forma de produção ([0010](0010-tudo-em-docker-compose-prototipo-local-producao-na-infra-da-.md)).

## Opções

- **Escolhida:** Dockerfile em estágios (`base`, `dev`, `prod`) e um serviço `api-dev` para tarefas de desenvolvimento.
- **Descartadas:** duas imagens em Dockerfiles separados (duplica a instalação de dependências do sistema, como pango e harfbuzz); manter uma imagem só e remover as dependências de dev na mão (frágil, e o CI precisa delas).

## Decisão

- `prod` (último estágio, padrão de `docker build` sem `--target`) instala só `requirements.txt` e roda como o usuário `app` (uid 10001). Os serviços `api` e `scheduler` pedem `target: prod` de forma explícita, para que reordenar estágios não traga root e ferramentas de dev de volta.
- `dev` acrescenta `requirements-dev.txt` e continua como root. O serviço `api-dev` (profile `dev`, `restart: "no"`) usa esse estágio e não sobe com um `docker compose up` comum.
- `make test`, `lint`, `typecheck`, `seed`, `snapshot` e `ingest` rodam no `api-dev`. O `snapshot` é o único comando que grava em `./data`; em produção a API só lê `./data/seed` (`seed --if-empty`).
- O CI constrói `--target dev` para rodar ruff, mypy e pytest, e `--target prod` para garantir que o estágio de produção compila.

## Consequências

- Em produção, a aplicação só grava em `/tmp/faperon-cache`, `/app/staticfiles` e no `/app` (HOME de `app`, usado por caches do WeasyPrint), todos de `app`. O volume `./data` precisa ser legível por outros usuários no host.
- A primeira execução de `make seed`, `make snapshot` ou `make test` num servidor novo constrói também a imagem de dev.
- O código da aplicação ainda é gravável pelo usuário `app` (`COPY --chown`); endurecer isso, copiando como root, fica como melhoria futura.
