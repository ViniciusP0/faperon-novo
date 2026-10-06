# ADR 0027: Página de notícias como listagem que aponta para o Wix

Status: Aceita

## Contexto

O `/blog` do Wix é a página "Todas as notícias" da FAPERON, e no projeto novo ele era só um link externo. As notícias já são importadas do feed do Wix para `noticias.json` ([0018](0018-noticias-importadas-do-wix-por-script-pontual-manage-py-impo.md), [0020](0020-conteudo-editorial-no-codigo-sem-cms.md)), mas só com título, resumo, data, imagem e link; o texto completo continua no Wix.

## Opções

- **Escolhida:** página `/noticias` no novo site que lista as notícias importadas, com filtro por categoria e paginação, e cada cartão abre o texto no Wix em nova aba.
- **Descartada por ora:** importar o texto completo e criar `/noticias/[slug]` (novo importador, formatação do texto e direitos das imagens; fica para a migração da Fase 2, [0012](0012-redirects-301-de-todas-as-urls-do-wix-fase-de-producao.md)).

## Decisão

- Rota `/noticias`, com redirect permanente de `/blog` para `/noticias` no `next.config.mjs`.
- O importador passa a gravar `categorias` (as `<category>` do feed: Faperon e Geral); o `noticias.json` existente recebeu só esse campo, sem alterar o conteúdo publicado.
- Filtro (`?categoria=`) e paginação (`?pagina=`, 12 por página) resolvidos no servidor por uma função pura, com links comuns; sem JavaScript também funciona. Parâmetros inválidos nunca falham: categoria desconhecida vira "Todas", página inválida vira 1 e página além da última vira a última.
- "Notícias" entra no menu e no rodapé, e os "Ver todas as notícias" do Início passam a apontar para `/noticias`. `WIX_PAGINAS.noticias` deixou de existir.
- Entre 1024 e 1099 px o menu de 6 itens não cabe com o botão inteiro, então o rótulo do botão de acesso encurta para "Acessar" (o nome acessível continua "Acessar o sistema").

## Consequências

- O visitante vê e filtra todas as notícias sem sair do site, mas o texto completo ainda depende de o Wix continuar no ar.
- A lista tem as 20 notícias que o feed expõe hoje; novas entram ao rodar `npm run importar:noticias` e publicar (ADR 0020).
- O feed não traz tempo de leitura, e o autor foi deixado de fora; a busca por texto não existe.
- Os testes do importador (`scripts/*.test.mjs`) passam a rodar no vitest.
