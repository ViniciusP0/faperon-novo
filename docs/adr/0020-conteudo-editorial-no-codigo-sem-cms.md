# ADR 0020: Conteúdo editorial no código, sem CMS

Status: Aceita (substitui a ADR 0004)

## Contexto

A ADR 0004 adotou o Wagtail como CMS headless. O cliente decidiu não usar o Wagtail. O Início, a Central e as notícias têm pouco conteúdo editorial e mudam raramente; o restante do site é dado do IBGE.

## Opções

- **Escolhida:** conteúdo em arquivos versionados dentro de `apps/web/src/content/` (textos em TypeScript, notícias em JSON, imagens em `apps/web/public/noticias/`).
- **Descartadas:** manter o Wagtail; outro CMS (Strapi, Payload); banco de dados só para textos.

## Decisão

- O Django deixa de ter o app de conteúdo, o admin e o servidor de mídia; fica só com indicadores, ingestão, análise e PDF.
- O Next.js lê o conteúdo direto dos arquivos. Mudar um texto é um pull request.
- As notícias vêm do site Wix pelo script manual `npm run importar:noticias` em `apps/web`, que substitui o comando `manage.py import_wix_news` da ADR 0018 (a decisão de importar de forma pontual continua valendo).
- Os endpoints `/api/v1/conteudo/*` e as rotas `/admin/` e `/media/` deixam de existir.

## Consequências

- Um serviço a menos para operar e uma superfície pública menor.
- Editores sem acesso ao repositório não conseguem publicar. Se isso virar necessidade na Fase 2, uma nova ADR reavalia um CMS.
- O site precisa de novo build para publicar uma notícia.
