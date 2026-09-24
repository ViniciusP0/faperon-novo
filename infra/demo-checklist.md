# Checklist de demo (notebook)

Antes de cada apresentação:

1. Desativar suspensão e hibernação na tomada (Configurações > Energia).
2. Conferir rede e que o Tailscale está conectado (`tailscale status`).
3. `docker compose up -d` e aguardar `docker compose ps` mostrar `api` como `healthy`.
4. Se o banco estiver vazio ou desatualizado: `make seed` (não depende do IBGE).
5. Publicar o link: `make funnel` (ou `infra/funnel.ps1 -Up`). Anotar a URL `https://<maquina>.<tailnet>.ts.net`.
6. Abrir a URL fora da rede local (celular em 4G) e percorrer Início -> Central -> Painel -> PDF.
7. Confirmar que `https://<url>/api/schema/` e `https://<url>/admin/` **não** abrem pelo Funnel (respondem 404).
8. Depois da demo: `make funnel-off`.

Notas:

- Containers usam `restart: unless-stopped`; o Docker Desktop e o Tailscale devem iniciar com o Windows.
- O `scheduler` roda a ingestão ao subir se a última carga tiver mais de 3 dias.
- O Postgres não publica porta no host.
- Se a porta 443 do Funnel já estiver em uso por outro app (`tailscale funnel status`), publique em outra porta sem derrubá-lo: `tailscale funnel --bg --https=8443 3000` (URL termina em `:8443`) e desligue com `tailscale funnel --https=8443 off`.
- O proxy do Next só encaminha `/api/v1/`; `/api/schema/`, `/api/docs/` e `/admin/` respondem 404 pelo link público.
