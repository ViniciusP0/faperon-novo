# SPEC-09: Painel Agro Analítico em página narrativa

## Contexto

O painel (`/painel`) hoje é um formulário de filtros num card, seguido de quatro abas (Ranking, Série histórica, Comparação, Análise estratégica). O dado principal fica dentro de uma tabela de 52 linhas, as métricas da análise são caixas pequenas de borda fina e não há um resumo visual do recorte. A página parece uma ferramenta colada no site, sem a linguagem visual da página inicial (cards verdes, números grandes, manchete com destaque).

**Público prioritário:** público geral e imprensa. A primeira tela precisa contar uma história em segundos, sem exigir que a pessoa entenda os filtros. Técnicos continuam tendo todo o detalhe (tabela completa, comparação, PDF), só que abaixo da dobra.

## Critério de aceite principal

Ao escolher um produto, a pessoa vê, sem trocar de aba nem rolar mais que uma tela, uma manchete com o número principal, quatro números-chave em destaque e os dez maiores municípios em barras. Série histórica, comparação e análise ficam na mesma página, em seções roláveis, sem perder nenhum dado nem filtro que existe hoje.

## O que muda

### 1. Estrutura: abas viram seções roláveis

A página passa a ter, de cima para baixo:

1. **Abertura** (fundo verde, como hoje): título, frase curta e o **seletor de produto** (item 2).
2. **Barra de recorte** (fixa no topo ao rolar, `sticky`): indicador, ano inicial, ano final, território (Rondônia ou um município), **Copiar link** e **Gerar PDF**. Abaixo dela, uma navegação por âncoras: Números · Ranking · Evolução · Comparação · Análise.
3. **Números do recorte** (item 3).
4. **Ranking** (item 4).
5. **Evolução** (série histórica, item 5).
6. **Comparação** (item 6).
7. **Análise** (item 7).
8. **Nota metodológica**, uma única vez no fim da página (hoje aparece em cada aba).

Todas as seções aparecem juntas quando o recorte está pronto. Não há mais `role="tablist"`.

**Parâmetro `aba` na URL:** continua sendo lido, para não quebrar links já compartilhados e o link da página inicial. Ao abrir a página com `aba=serie|comparacao|analise`, a página rola até a seção correspondente (`#evolucao`, `#comparacao`, `#analise`). Clicar num item da navegação por âncoras atualiza `aba` na URL (com `router.replace`, sem rolar a página pelo Next) e rola suavemente até a seção, respeitando `prefers-reduced-motion`. `aba=ranking` ou ausente não rola.

**Território global:** o filtro `municipio`, que hoje fica só dentro da aba Série, sobe para a barra de recorte. Ele afeta Números, Evolução, Análise e o PDF. O Ranking é sempre estadual. A Comparação por produtos continua usando o território, como hoje.

### 2. Seletor de produto

- **Segmento** vira um controle segmentado grande (Agricultura / Pecuária), com `role="radiogroup"`. Trocar o segmento limpa produto, indicador e listas de comparação, como hoje.
- **Produtos em destaque:** chips grandes, clicáveis, para os produtos mais procurados do segmento. A lista fica em `apps/web/src/content/painel.ts` (slugs), e só aparecem os que existem no catálogo da API. Lista inicial, com slugs conferidos em `/api/v1/produtos` (68 produtos) em 06/10/2026:
  - **Agricultura:** `soja-em-grao`, `milho-em-grao`, `cafe-em-grao-total`, `cacau-em-amendoa`, `mandioca`, `feijao-em-grao`.
  - **Pecuária:** `bovino`, `leite`, `galinaceos-total`, `suino-total`.
- **Todos os produtos:** os campos "Buscar produto" e "Produto" continuam existindo, com os mesmos rótulos (a busca sem acento é coberta pelo E2E), num bloco "Outros produtos" ao lado dos chips.
- Chip selecionado com `aria-pressed="true"` e o mesmo estilo de destaque do produto no `<select>`.

**Estado vazio (sem produto):** no lugar da caixa tracejada atual, a abertura mostra os chips em destaque com a chamada "Escolha um segmento e um produto para ver o ranking, a evolução, a comparação e a análise." (o E2E procura "Escolha um segmento e um produto"). A nota metodológica sem `meta` continua no fim.

### 3. Números do recorte

**Manchete** (como a da página inicial): uma frase com o número principal em destaque, por exemplo "Em **2024**, Rondônia produziu **1,2 milhão de toneladas** de soja (em grão)." Ela é montada no cliente a partir do ranking (total estadual e ano de referência) ou da série (último ponto, quando há município). A frase segue o indicador, pelos slugs que a API publica hoje:

| Slug do indicador | Frase |
|---|---|
| `quantidade-produzida` | "Rondônia produziu **{valor}** de {produto}" |
| `producao-de-origem-animal` | "Rondônia produziu **{valor}** de {produto}" |
| `area-plantada` | "Rondônia plantou **{valor}** de {produto}" |
| `area-colhida` | "Rondônia colheu **{valor}** de {produto}" |
| `efetivo` | "Rondônia tinha **{valor}** de rebanho {produto}" |
| `valor-da-producao` | "{produto} gerou **{valor}** em Rondônia" |

O mapa fica numa função pura em `lib/`, com teste. Indicador sem frase mapeada, como `rendimento-medio`, usa a forma neutra: "{indicador} de {produto} em Rondônia, {ano}: **{valor}**."

**Unidades:** valores em "Mil Reais" aparecem em reais por extenso compacto ("R$ 1,2 bilhão"), multiplicando por 1.000 só na exibição. As demais unidades aparecem compactas com a unidade em minúsculas ("1,2 milhão de toneladas", "14,3 milhões de cabeças").

**Indicadores de média ponderada** (`agregacao = "media_ponderada"`, como o rendimento médio): não existe total estadual somável nem percentual do total. Nesse caso, o card de valor mostra a média ponderada estadual que a API já devolve em `total_estadual` (conferido: soja, rendimento médio, 2024 = 3.503,7 kg/ha), rotulada "Média de Rondônia". A análise devolve `concentracao_top5_percentual = null` nesse caso. O card de concentração é **trocado** por "Maior rendimento", com o município do 1º lugar e o valor. Nenhum card mostra "–" só porque a métrica não se aplica.

**Quatro cards grandes** (fundo `brand-dark`, número em `text-4xl` ou maior, rótulo curto, frase de apoio):

| Card | Sem município | Com município | Fonte |
|---|---|---|---|
| Valor no ano final | Total de Rondônia | Valor do município | ranking (`total_estadual`) / série (último ponto) |
| Variação no período | % e seta ▲/▼ colorida, absoluta como apoio | idem, do município | análise (`variacao_percentual`, `variacao_absoluta`) |
| Município líder | Nome do 1º e % do total | **Posição do município** no ranking ("12º de 52") | ranking |
| Concentração | % dos cinco maiores | Participação do município no total do estado | análise (`concentracao_top5_percentual`) / ranking (`percentual_total`) |

Valor ausente aparece como "–" e sigiloso como "X". Nunca aparece zero, seguindo a regra da nota metodológica. A seta da variação usa texto acessível ("alta de" / "queda de"), não só cor.

O **CAGR**, o maior ano e o menor ano saem dos cards e vão para a seção Análise (item 7).

### 4. Ranking

- **Dez maiores em barras horizontais**, em HTML/CSS (não ECharts): posição, nome, barra proporcional, valor formatado e % do total. O 1º lugar tem cor de destaque (`brand-lime` sobre `brand-dark`) e os demais usam o verde da marca.
- Botão **"Ver os 52 municípios"** expande a tabela completa atual (mesma tabela, mesmas colunas, sigiloso "X" no fim). A tabela fica no DOM recolhida dentro de `<details>`, para o leitor de tela e para o E2E. No E2E, o teste abre o `<details>` antes de contar as 53 linhas.
- Quando há município no território, a linha dele é destacada nas barras (se estiver no top 10) e na tabela.

### 5. Evolução (série histórica)

- O gráfico passa de barras para **área** (linha com preenchimento em gradiente da cor da marca), mais alto (420 px no desktop e 300 px no celular).
- Anotações no gráfico: **pico** do período e **último ano**, com o valor (`markPoint`).
- A linha de tendência tracejada, as frases `serie-descricao` e `serie-tendencia`, a tabela "Ver tabela de dados do gráfico" e a coluna "Tendência linear" continuam iguais. O E2E e o PDF dependem delas.
- O seletor "Recorte territorial" sai da seção, porque o território agora é global (item 1). O E2E é ajustado para o novo rótulo "Território".
- O tema escuro continua via `comTemaEscuro`, que passa a tratar também a série de área (cor e gradiente em `PALETA_ESCURA`).

### 6. Comparação

O comportamento não muda: modo municípios/produtos, limite de 5, "Usar os 3 maiores do ranking", chips removíveis, bloqueio 422 por unidade e tabela alternativa. Muda o visual:

- O modo vira o mesmo controle segmentado do segmento, mantendo `type="radio"` e os rótulos "Municípios" e "Produtos" (o E2E usa `getByLabel("Produtos", { exact: true })`).
- Os controles ficam numa coluna à esquerda e o gráfico, maior, à direita, a partir de `lg`.
- O gráfico passa para **linhas** quando há mais de 6 anos no período (barras agrupadas com 5 séries × 10 anos ficam ilegíveis) e continua em barras para até 6 anos.

### 7. Análise

- Título "Análise estratégica" e subtítulo `data.titulo` mantidos (o E2E procura os dois).
- Os parágrafos vêm em destaque de leitura: largura máxima de ~65 caracteres, primeiro parágrafo em fonte maior, como lead de matéria.
- Ao lado, em `lg`, uma coluna com **CAGR, maior ano e menor ano** em cards menores, no mesmo estilo dos cards do item 3, em versão clara.
- "Cinco maiores municípios" continua com esse título (o E2E procura), agora em barras horizontais, no mesmo componente do ranking, limitado a 5.

### 8. Linguagem visual

- Usa os tokens que já existem (`brand-dark`, `brand`, `brand-lime`, `brand-fg`, `surface-alt`, `ink-muted`). Nenhuma cor fixa nova fora dos tokens, salvo a paleta dos gráficos (já em `chart-options.ts`).
- Seções alternam fundo `bg-card` e `bg-surface-alt`, com título de seção no padrão da home: etiqueta pequena em caixa alta em `brand-fg` e `h2` grande em `brand-strong`.
- Números sempre em `tabular-nums`, com `formatCompacto` nos cards ("1,2 mi") e o valor completo no `title` e no texto para leitor de tela.
- Celular: cards em 2 colunas, barras do ranking com nome acima da barra, barra de recorte recolhida num botão "Filtros (n)" que abre um painel. Nada de rolagem horizontal da página.
- O tema escuro precisa ficar legível em todas as seções novas.

## Fora do escopo

- Nenhuma mudança na API, nos tipos (`api-types.ts`), no PDF (`relatorio.pdf`) ou em `filters.ts`, além de aceitar a nova âncora. O formato da URL é o mesmo.
- Mapa coroplético dos municípios: fica como ideia para depois. Exigiria GeoJSON dos 52 municípios e um novo componente ECharts.
- Página inicial e Central de Inteligência não mudam.

## Componentes (`apps/web/src/components/painel/`)

| Arquivo | Papel |
|---|---|
| `painel.tsx` | Orquestra a página: lê a URL, carrega catálogo, monta as seções. Perde `Abas`, ganha `NavSecoes` e a rolagem por `aba`. |
| `seletor-produto.tsx` (novo) | Segmento + chips em destaque + busca/select "Outros produtos". |
| `barra-recorte.tsx` (novo) | Indicador, período, território, Copiar link, Gerar PDF; sticky; versão recolhida no celular. Absorve a parte de `filtros.tsx` que não é produto. |
| `numeros.tsx` (novo) | Manchete + 4 cards. Reaproveita as queries `ranking`, `serie` e `analise` (mesmas `queryKey`, sem requisição duplicada). |
| `barras.tsx` (novo) | Lista de barras horizontais acessível (`<ol>`), usada pelo Ranking (top 10) e pela Análise (top 5). |
| `ranking.tsx` | Top 10 em `Barras` + `<details>` com a tabela atual. |
| `serie.tsx` | Sem o select de território; gráfico de área. |
| `comparacao.tsx` | Novo layout; mesma lógica. |
| `analise.tsx` | Lead + coluna de métricas + top 5 em `Barras`. |
| `comuns.tsx` | `NotaMetodologica` passa a ser usada uma vez, em `painel.tsx`. |
| `filtros.tsx` | Removido; o conteúdo é dividido entre `seletor-produto` e `barra-recorte`. |

Funções puras novas em `apps/web/src/lib/` (com teste unitário): `manchetePainel(...)` (frase e verbo por indicador) e `opcaoSerie` / `opcaoComparacao` atualizadas em `chart-options.ts`.

## Gherkin

```gherkin
# language: pt
Funcionalidade: Painel Agro Analítico narrativo

  Cenário: Primeira visita, sem produto
    Dado que abro "/painel" sem parâmetros
    Então vejo os produtos em destaque do segmento Agricultura
    E vejo "Escolha um segmento e um produto"
    E vejo a nota metodológica

  Cenário: Escolher um produto em destaque
    Dado que estou em "/painel"
    Quando clico no produto em destaque "Soja (em grão)"
    Então a URL contém "produto=soja-em-grao", um indicador e um período
    E vejo uma manchete com o total de Rondônia no ano final
    E vejo quatro números-chave: valor, variação, município líder e concentração
    E vejo os 10 maiores municípios em barras, o 1º em destaque
    E vejo as seções Evolução, Comparação e Análise na mesma página

  Cenário: Tabela completa do ranking
    Dado um recorte de Soja, quantidade produzida, 2015–2024
    Quando abro "Ver os 52 municípios"
    Então a tabela tem 52 linhas de municípios
    E municípios sigilosos aparecem ao final marcados com "X"

  Cenário: Território de um município
    Dado um recorte de Soja, quantidade produzida, 2015–2024
    Quando escolho o território "Vilhena"
    Então o card de valor mostra o valor de Vilhena
    E o card do líder mostra a posição de Vilhena no ranking
    E a descrição da evolução cita "Vilhena"
    E o link "Gerar PDF" contém "municipio=1100304"

  Cenário: Link antigo com aba
    Dado que abro "/painel?segmento=pecuaria&produto=leite&indicador=valor-da-producao&inicio=2018&fim=2022&aba=analise"
    Então a página rola até a seção "Análise estratégica"
    E vejo "Leite — Valor da produção, 2018–2022"
    E vejo "Cinco maiores municípios"

  Cenário: Navegar pelas seções
    Dado um recorte pronto
    Quando clico em "Evolução" na navegação da página
    Então a URL contém "aba=serie"
    E a seção de evolução fica visível

  Cenário: Valores sigilosos e ausentes nos cards
    Dado um recorte cujo valor do ano final é sigiloso
    Então o card de valor mostra "X" e nunca "0"
```

## Testes

- **Unitários (Vitest):** `Barras` (ordem, largura proporcional, destaque, sigiloso), `Numeros` (com e sem município, "X" e "–"), `manchetePainel` (verbo por indicador e fallback), `opcaoSerie` (área, `markPoint` de pico e último ano, tendência preservada), `opcaoComparacao` (linha acima de 6 anos), `comTemaEscuro` (série de área). Os testes de `Ranking` em `painel.test.tsx` passam a abrir o `<details>` antes de contar as linhas.
- **E2E (Playwright), `e2e/fluxo.spec.ts`:**
  - Trocar `getByRole("tab", …)` pela navegação de seções.
  - Abrir "Ver os 52 municípios" antes de contar as 53 linhas.
  - Trocar "Recorte territorial" por "Território".
  - O teste "teclado: abas do painel navegam com setas" vira "teclado: a navegação de seções é alcançável por Tab e leva à seção".
  - Os demais testes (comparação, 422, PDF, axe sem violações sérias) continuam sem mudança de intenção.
- **Responsivo (`e2e/responsivo.spec.ts`):** sem rolagem horizontal em 375 px com recorte pronto.
- **Visual:** captura do painel em desktop e celular, nos temas claro e escuro, antes de publicar na demo.

## Decisão a registrar

Criar o **ADR-0022 "Painel em página narrativa em vez de abas"**: troca de abas por seções roláveis, motivada pelo público geral e pela imprensa. Consequência: mais requisições simultâneas ao abrir um recorte (ranking, série, análise; a comparação só com 2 itens ou mais), aceitáveis porque a API já serve essas consultas de views materializadas (ADR-0005).
