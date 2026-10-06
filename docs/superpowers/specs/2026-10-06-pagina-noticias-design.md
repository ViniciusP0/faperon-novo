# Página de Notícias — design

Data: 2026-10-06 · Status: aguardando revisão

## Objetivo

Trazer para o novo site a página "Todas as notícias" que hoje existe só no Wix (`https://www.faperon.com.br/blog`), para que o visitante veja e filtre as notícias da FAPERON sem sair do site. Os botões "Ver todas as notícias" deixam de mandar o visitante para o Wix.

## Decisões já tomadas

- **Escopo: só a listagem.** Cada notícia continua abrindo o texto completo no Wix, em nova aba, como já fazem os cartões do Início. Não se importa o corpo das notícias nem se cria página por notícia.
- **Rota `/noticias`**, no padrão em português das outras rotas (`/sobre`, `/informativos-tecnicos`), com redirect permanente de `/blog` para `/noticias`.
- **Conteúdo no código, sem CMS** (ADR 0020). As notícias continuam vindo do Wix pelo script manual `npm run importar:noticias` (ADR 0018).
- **Sem dependência nova.**

## Fora do escopo

Busca por texto, tempo de leitura, autor, página de cada notícia, importação do texto completo, qualquer mudança no texto das notícias e o mapa completo de redirects do Wix (ADR 0012, que segue na Fase 2; aqui entra só `/blog`).

## Estado atual

- `apps/web/src/content/noticias.json`: 20 notícias (18/02/2025 a 17/09/2026), da mais recente para a mais antiga, com `slug`, `titulo`, `resumo`, `data`, `imagem` (uma sem imagem) e `url_original`. Tipadas em `src/content/noticias.ts` (`Noticia`, `NOTICIAS`, `noticiasRecentes`).
- `scripts/importar-noticias-wix.mjs` lê o RSS `https://www.faperon.com.br/blog-feed.xml` (`lerFeed`), com a home do Wix como reserva (`lerHome`), e grava o JSON e as imagens em `public/noticias/`. O script não tem testes.
- O RSS traz `<category>` em todos os itens: "Faperon" (17) e "Geral" (12); um item pode ter as duas. O tempo de leitura não existe no feed.
- O Início aponta "Ver todas as notícias" (no ticker e na seção "Notícias recentes") para `WIX_PAGINAS.noticias` em `src/lib/site.ts`.
- `MENU` em `src/lib/site.ts` alimenta o cabeçalho (desktop e móvel) e a coluna "Navegação" do rodapé.
- `NoticiaChamada` (`src/components/inicio/noticia-chamada.tsx`) é o cartão do Início: imagem 3:2 (ou a marca FAPERON quando não há imagem), título, data e link externo para o Wix em nova aba.

## Requisitos

### 1. Dados: categorias

- `Noticia` ganha `categorias: string[]`, com os nomes como vêm do feed ("Faperon", "Geral"), sem repetição e na ordem do feed.
- `lerFeed` passa a ler todas as `<category>` do item, inclusive em CDATA. `lerHome` (reserva) devolve `categorias: []`.
- O importador grava `categorias` no JSON. Os outros campos não mudam de formato.
- O `noticias.json` é regenerado uma vez a partir do feed. Se a regeneração mudar algo além de `categorias` (texto, datas, slugs ou imagens de notícias já existentes), só o campo `categorias` é incorporado, para esta entrega não alterar o conteúdo publicado.
- Notícia sem categoria aparece só em "Todas".

### 2. Rota e redirect

- Nova página `src/app/noticias/page.tsx`, renderizada no servidor.
- `next.config` ganha `redirects()` com `/blog` → `/noticias`, permanente (308).
- `/noticias` entra no `sitemap` e ganha `metadata` própria: título "Notícias", descrição e `canonical` `/noticias`.

### 3. Layout da página

- Abertura com `HeroPagina` sem foto: trilha "Início / Notícias" e título "Todas as notícias", com uma frase de apoio curta.
- Filtro por categoria logo abaixo: chips "Todas", "Faperon" e "Geral", gerados a partir das categorias presentes nos dados (ordem fixa: Todas primeiro, depois as outras em ordem alfabética), cada um com a contagem de notícias, por exemplo "Faperon (17)".
- Texto de resultado, por exemplo "17 notícias", visível e anunciado a leitores de tela.
- Grade de cartões com `NoticiaChamada`: 1 coluna no celular, 2 no tablet e 3 no desktop. Na página de notícias, o cartão mostra também as categorias como etiquetas pequenas acima do título; no Início ele fica como está.
- Os cartões entram com o `Revelar` existente, escalonados.
- Paginação abaixo da grade quando houver mais de uma página: "Anterior", números das páginas e "Próxima".

### 4. Filtro e paginação pela URL

- Parâmetros `categoria` (nome em minúsculas e sem acento, por exemplo `faperon`, `geral`) e `pagina` (a partir de 1). Exemplos: `/noticias?categoria=geral`, `/noticias?categoria=faperon&pagina=2`.
- 12 notícias por página.
- Tudo é resolvido no servidor por uma função pura (filtrar e paginar), então filtro e paginação funcionam sem JavaScript e os endereços podem ser compartilhados.
- Trocar de categoria volta para a página 1.
- Entradas inválidas nunca quebram a página:
  - `categoria` desconhecida é tratada como "Todas".
  - `pagina` não numérica, zero ou negativa é tratada como 1.
  - `pagina` maior que a última mostra a última página.
- Categoria sem notícias mostra um estado vazio com link para "Todas".
- Os chips e os links de paginação são `<a>` comuns. O item ativo tem `aria-current="page"`, e a paginação fica num `<nav aria-label="Paginação">`.

### 5. Navegação

- `ROTAS` ganha `noticias: "/noticias"`.
- `MENU` ganha "Notícias" entre "Informativos Técnicos" e "Fale Conosco". Isso vale para o cabeçalho (desktop e móvel) e para o rodapé.
- Os dois "Ver todas as notícias" do Início apontam para `/noticias`, na mesma aba, sem o ícone de link externo nem o aviso "(abre o site atual em nova aba)".
- `WIX_PAGINAS.noticias` é removido, e `site.test.ts` é ajustado.

## Restrições transversais

- Acessibilidade: axe sem violações sérias ou críticas na página nova; o cabeçalho continua navegável por teclado.
- O cabeçalho desktop com 6 itens não pode quebrar nem transbordar a partir de 1024 px de largura. Se não couber, ajustar espaçamento ou tamanho do texto da navegação, sem esconder itens.
- Sem rolagem horizontal no celular (390 px).
- Funciona nos temas claro e escuro.
- Testes existentes seguem sem mudança de expectativa, exceto `site.test.ts` (remoção de `WIX_PAGINAS.noticias`) e os e2e que hoje esperam o link do Wix no Início.

## Testes

- Unitários:
  - Função de filtro e paginação: categoria válida, desconhecida, sem acento; página válida, inválida e além da última; contagem por categoria; estado vazio.
  - `lerFeed` com e sem `<category>` (em CDATA e sem), item com duas categorias e categoria repetida. O `vitest.config` passa a incluir os testes de `scripts/`.
  - Página ou componente de filtros: chip ativo com `aria-current` e links com os parâmetros certos.
- e2e:
  - Início → "Ver todas as notícias" → `/noticias` com 12 cartões.
  - Filtro "Geral" mostra só notícias dessa categoria.
  - Página 2 mostra as restantes.
  - `/blog` redireciona para `/noticias`.
  - Axe sem violações sérias.
  - Celular sem rolagem horizontal em `/noticias`.

## Entrega

- Mudança visual: publicar na demo do Tailscale depois de verificar (regra permanente do projeto).
- ADR curta registrando a página de notícias como listagem que aponta para o Wix e o redirect `/blog`.
- Commits atômicos em Conventional Commits, numa branch própria.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| A regeneração do JSON muda textos ou imagens já publicados | Incorporar só o campo `categorias` (Requisito 1) |
| O cabeçalho com 6 itens transborda em telas médias | Critério de 1024 px e conferência visual |
| Parâmetros de URL estranhos derrubam a página | Normalização na função pura, coberta por testes |
| O Wix muda o feed e quebra a leitura de categorias | `lerFeed` testado; item sem categoria continua funcionando |
| Os links da listagem dependem do Wix continuar no ar | Aceito: o texto completo fica no Wix até a migração (ADR 0012, Fase 2) |
