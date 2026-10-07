# Observatório Agropecuário (Entrega 1) — design

Data: 2026-10-07 · Status: aguardando revisão

## Objetivo

Criar, dentro da Central de Inteligência, um **Observatório**: uma leitura panorâmica e explicada da agropecuária de Rondônia para a **diretoria e os técnicos da FAPERON**, como subsídio para posicionamento institucional. O Painel Agro Analítico continua sendo a ferramenta de consulta objetiva; o Observatório responde "o que está acontecendo e por quê", com gráficos, mapas e texto gerado por regras, sempre com fonte, data e limites do dado.

Critério de sucesso: um técnico abre o Observatório sem nenhum filtro e lê, em cada bloco, uma conclusão correta e verificável (manchete), o gráfico que a sustenta e a explicação de como ler a métrica; consegue mudar o recorte e compartilhar o link da visão.

## Decisões já tomadas

- **Público:** diretoria e técnicos da FAPERON. Tom técnico, com métricas de concentração, decomposição e comparação.
- **Entregas:** o Observatório é feito em três entregas, cada uma com spec, plano e implementação próprios. Esta spec cobre só a **Entrega 1**.
  - Entrega 1 (esta): hub da Central, página do Observatório, malha municipal (mapas), PAM e PPM já ingeridas, mais **PPM 94** (vacas ordenhadas) e **IPCA** (deflator).
  - Entrega 2: safra corrente (IBGE LSPA) e Pesquisa Trimestral do Abate (SIDRA).
  - Entrega 3: exportações (ComexStat/MDIC) e ICMS do setor primário (Boletim de Arrecadação do CONFAZ). Ressalva já registrada: o ICMS do setor primário é baixo pela desoneração das exportações e pelo diferimento; não mede a receita do agro e o texto deve dizer isso.
  - PDF e CSV do Observatório entram nas Entregas 2 e 3.
- **Estrutura:** `/central-de-inteligencia` vira um hub com duas portas (Observatório e Painel); o Observatório fica em `/central-de-inteligencia/observatorio`, página narrativa longa (ADR 0022).
- **Arquitetura:** novo contexto Django `observatorio`, só leitura, com métricas e textos por regras no backend; o Next.js só renderiza ([ADR 0028](../../adr/0028-observatorio-como-contexto-de-leitura-com-valores-deflacionados-pelo-ipca.md)).
- **Valores monetários deflacionados pelo IPCA**, a preços do ano de referência.
- **Exploração livre:** cada bloco tem filtros próprios, mas abre com um padrão (resposta pronta). Filtros na URL; o link reproduz a visão. Sem PDF/CSV nesta entrega.
- **Textos determinísticos**, sem IA (ADR 0007).

## Fora do escopo

PDF e CSV; LSPA, Abate, ComexStat e ICMS; densidade por km²; regiões imediatas/intermediárias do IBGE (usa-se a microrregião já cadastrada); cache dedicado (só se o requisito de desempenho falhar); qualquer mudança no Painel além de aceitar os links vindos do Observatório.

## Estado atual

- `apps/web/src/app/central-de-inteligencia/page.tsx`: landing com texto e CTA para o Painel; conteúdo em `src/content/central.ts`.
- Ingestão (`apps/api/ingestao/tabelas.py`): SIDRA 5457 (PAM: área plantada, área colhida, quantidade produzida, rendimento médio, valor da produção), 3939 (PPM: efetivo dos rebanhos) e 74 (PPM: produção de origem animal, quantidade e valor). `TabelaSidra` exige `classificacao`.
- Banco: 52 produtos agrícolas, 16 de pecuária, medições de 1974 a 2025, 52 municípios com `microrregiao`. Indicadores com regra de agregação (`soma` ou `media_ponderada`).
- `indicadores/servicos.py`: `obter_recorte`, `anos_com_dados`, `resolver_periodo`, `ranking`, `serie`, `comparacao_*`, `meta_da_tabela`. `indicadores/api/destaques.py` monta resumos por recorte.
- `analise/regras.py` e `analise/tendencia.py`: regras determinísticas, `formatar_numero`, `calcular_cagr`, `tendencia_linear`, limiares de concentração.
- Front: ECharts (ADR 0009), TanStack Query com filtros na URL, tipos gerados do OpenAPI (ADR 0011), `components/painel/grafico.tsx`.

## Requisitos

### 1. Dados novos

**PPM 94 — vacas ordenhadas.**
- Entra em `TABELAS` como tabela de pecuária, gravando em `Medicao` como o produto "Vacas ordenhadas" com o indicador de efetivo (cabeças), nível município, série anual.
- `TabelaSidra.classificacao` passa a aceitar `None` (tabela sem classificação de produto); o parser e a promoção do staging tratam esse caso.
- Código da variável confirmado no spike inicial (tarefa 1 do plano), com fixture gravada para os testes do parser.

**IPCA — SIDRA 1737.**
- Novo modelo `IndicePreco(ano, indice_medio, carga)`: média aritmética dos 12 números-índice mensais do IPCA do ano. Ano com menos de 12 meses publicados **não** é gravado.
- Carregado pelo mesmo agendador, com `Carga`, hash da resposta e inclusão no snapshot (ADR 0006, 0017).
- Só a Ingestão conhece o código 1737 e as variáveis.

**Malha municipal.**
- Comando `manage.py baixar_malha` busca a malha de RO por município na API de malhas v3 do IBGE (qualidade mínima, GeoJSON), confere que há exatamente os 52 códigos IBGE do cadastro e grava `apps/web/public/geo/ro-municipios.json` (propriedade `codigo_ibge` em cada feição). Arquivo versionado; nunca é buscado em tempo de execução.

### 2. Contexto `observatorio` (Django)

Dependências permitidas: `indicadores.servicos`, `indicadores.dominio`, `indicadores.models` (leitura), `IndicePreco` e `analise.regras`/`analise.tendencia` para formatação e tendência. Nenhum acesso ao SIDRA.

**`calculos.py`** — funções puras, sem ORM:
- `deflacionar(valor, ano, ano_ref, indices) -> Decimal | None`: `valor × indice[ano_ref] / indice[ano]`; `None` se faltar índice.
- `decompor_crescimento(area_ini, area_fim, rend_ini, rend_fim)`: decomposição logarítmica `ln(P1/P0) = ln(A1/A0) + ln(R1/R0)`; devolve a participação de área e de rendimento (somam 100%) e a variação da produção. `None` se algum valor for ausente ou ≤ 0. Se a produção não variou (|ln(P1/P0)| < 0,001), devolve participações `None` e o texto diz "estável".
- `perda_lavoura(plantada, colhida) -> Decimal | None`: `(plantada − colhida) / plantada × 100`, só com ambos OK e plantada > 0.
- `valor_por_hectare(valor_real, area_colhida)`.
- `hhi(participacoes)`: soma dos quadrados das participações em % (0 a 10.000).
- `cultura_dominante(valores_por_cultura)`: a cultura de maior valor da produção no município; empate resolvido pelo slug, em ordem alfabética.
- `dependencia(valores_por_cultura, limiar=50)`: a cultura cuja participação no valor agrícola do município passa do limiar, ou `None`.
- `agregar_microrregiao(itens)`: soma por microrregião respeitando a regra de agregação do indicador; indicador `media_ponderada` é recalculado pelos pares, nunca somado.
- Invariantes: valor sigiloso ou ausente nunca vira zero e fica fora dos totais; o número de municípios excluídos vai para `qualidade`.

**`regras.py`** — textos determinísticos (mesma entrada, mesmo texto), limiares nomeados como constantes, formatação pt-BR via `formatar_numero`. Cada bloco produz `manchete` (uma frase) e `como_ler` (2–3 frases fixas por métrica, com o ano de referência e a unidade preenchidos).

**`api/`** — quatro endpoints GET em `/api/v1/observatorio/`:

| Endpoint | Parâmetros (todos opcionais) | Padrão |
| --- | --- | --- |
| `panorama` | `ano`, `janela` ∈ {5, 10, 20} | último ano com valor da produção publicado pela PAM; 10 |
| `crescimento` | `cultura`, `inicio`, `fim` | cultura de maior valor no último ano; últimos 10 anos |
| `territorio` | `metrica` ∈ {valor, area, rebanho, dominante}, `cultura`, `ano` | `valor`, todas as culturas, último ano |
| `pecuaria` | `rebanho`, `inicio`, `fim` | `bovino`; últimos 10 anos |

Resposta de todos: `{ filtros, metricas, series, texto: { manchete, como_ler }, qualidade, meta }`.
- `filtros`: os valores efetivamente usados (já resolvidos os padrões) e as opções válidas de cada filtro, para o front montar os seletores.
- `qualidade`: `municipios_sem_dado`, `ano_ref_monetario`, `avisos[]` (textos fixos, ex.: valor sem carne bovina; IPCA do ano não fechado).
- `meta`: fonte(s), tabela(s) SIDRA, `atualizado_em` da última Carga.
- Parâmetro inválido → 400 no padrão atual (`indicadores/api/erros.py`); cultura ou rebanho inexistente → 404; recorte sem dados → 200 com `metricas` vazias e aviso em `qualidade`.
- Tipos expostos no OpenAPI (drf-spectacular) e gerados para o front (ADR 0011).

**Referência monetária:** `ano_ref` = o ano do filtro, se houver IPCA fechado para ele; senão, o último ano com IPCA fechado, informado em `qualidade.ano_ref_monetario` e no texto ("a preços de 2024").

### 3. Conteúdo dos blocos

**Bloco 1 — Panorama e composição** (`panorama`)
- Métricas: valor real das lavouras (PAM) + valor real da produção de origem animal (PPM 74) no ano; variação real na janela; área colhida total.
- Séries: treemap com as 8 culturas/produtos de maior valor + "demais"; área empilhada da composição na janela (mesmos 8 + "demais").
- Aviso fixo: o valor não inclui carne bovina/abate (a PPM não publica esse valor; entra na Entrega 2).
- Manchete: o item líder, sua participação e a mudança em p.p. na janela; ou, se a composição mudou pouco (todas as variações < 1 p.p.), uma frase de estabilidade.

**Bloco 2 — Por que cresceu** (`crescimento`)
- Métricas: variação da produção; participação de área e de rendimento (decomposição); perda média de lavoura no período e no último ano.
- Séries: área colhida, rendimento e produção (índice base 100 no ano inicial); perda de lavoura ano a ano; ranking de R$/ha real das culturas no ano final (só culturas com área colhida ≥ 1.000 ha, para evitar distorção de culturas residuais).
- Manchete: "X% do aumento da produção de {cultura} entre {inicio} e {fim} veio de ganho de produtividade", ou de área, ou "a produção caiu, puxada por…".

**Bloco 3 — Território** (`territorio`)
- Mapa coroplético dos 52 municípios: escala sequencial para `valor`/`area`/`rebanho`; por categoria para `dominante` (cultura dominante, até 8 cores + "outras").
- Agregado por microrregião (barras).
- Concentração: participação dos 5 maiores municípios e HHI, com a classificação dos limiares de `analise/regras.py`.
- Dependência: lista dos municípios em que uma cultura passa de 50% do valor agrícola.
- Manchete: concentração e o principal polo, ou o número de municípios dependentes de uma só cultura.

**Bloco 4 — Pecuária** (`pecuaria`)
- Métricas: efetivo do rebanho escolhido no ano final e variação; para `bovino`, participação dos 5 maiores municípios.
- Séries: efetivo ano a ano; mapa do efetivo por município; composição dos demais rebanhos no ano final.
- Leite: volume, valor real e **produtividade aparente** (litros por vaca ordenhada por ano = produção de leite da PPM 74, em mil litros, × 1.000 ÷ vacas ordenhadas da PPM 94), estadual e dos 5 maiores polos.
- Manchete: a tendência do rebanho (`tendencia_linear`) e o principal polo; para leite, a variação da produtividade.

### 4. Front-end

- `app/central-de-inteligencia/page.tsx` vira o hub: dois cartões (Observatório e Painel), cada um com uma frase sobre para que serve e um botão. Texto em `content/central.ts` (ADR 0020).
- `app/central-de-inteligencia/observatorio/page.tsx`: hero, índice lateral (padrão de `components/sobre/indice-secoes.tsx`) e os quatro blocos. Entra no sitemap.
- `components/observatorio/`:
  - `bloco.tsx`: o molde comum, com título, manchete, área do gráfico, alternância "ver como tabela", "como ler", filtros, fonte/data/qualidade e o link "ver no Painel" (com o recorte equivalente, quando existir).
  - `bloco-panorama.tsx`, `bloco-crescimento.tsx`, `bloco-territorio.tsx`, `bloco-pecuaria.tsx`.
  - `mapa-municipios.tsx`: ECharts `registerMap` com o GeoJSON estático; variantes contínua e por categoria; tooltip com município, valor e unidade.
  - `treemap.tsx`, `decomposicao.tsx` (barras divergentes área × rendimento).
- Dados por TanStack Query, um hook por endpoint. Filtros na URL com prefixo por bloco (`pan_ano`, `pan_janela`, `cre_cultura`, `cre_inicio`, `cre_fim`, `ter_metrica`, `ter_cultura`, `ter_ano`, `pec_rebanho`, `pec_inicio`, `pec_fim`). URL sem parâmetro = padrão do backend. Parâmetros desconhecidos são ignorados.
- Visual: paleta e componentes do design system atual, reaproveitando `components/painel/grafico.tsx`; animações conforme ADR 0026.

### 5. Estados e acessibilidade

- Carregando: skeleton por bloco. Erro: mensagem e "tentar de novo" no próprio bloco, sem derrubar a página. Recorte sem dados: mensagem com o motivo vindo de `qualidade`.
- Todo gráfico e mapa tem "ver como tabela" com os mesmos dados. A manchete é texto. No mapa por categoria, a legenda tem rótulos, e a tabela traz cultura e município (a cor nunca é a única pista). Filtros operáveis por teclado e com rótulo.

### 6. Desempenho

Cada endpoint responde em até 500 ms (p95) no notebook da demo com o banco completo. Se não responder, entra cache por processo chaveado pelo id da última Carga concluída (sem Redis, ADR 0013).

## Testes

- **pytest**
  - `calculos.py`: decomposição soma 100% e casos-limite (zero, ausente, produção estável); deflação; HHI; cultura dominante com empate; dependência; microrregião com média ponderada; sigiloso fora dos totais.
  - `regras.py`: golden tests das manchetes e do "como ler" de cada bloco.
  - Endpoints: padrões, validação (400), inexistente (404), recorte vazio (200 com aviso), forma da resposta.
  - Ingestão: parser da 94 (sem classificação) e da 1737 com fixtures; ano de IPCA incompleto não é gravado.
  - `baixar_malha`: recusa malha com códigos diferentes dos 52 do cadastro (fixture local, sem rede).
- **Vitest**: molde do bloco (manchete, alternância tabela/gráfico, estados), leitura e escrita dos filtros na URL, hub da Central.
- **Playwright**: Central → Observatório → mudar um filtro de um bloco → recarregar o link reproduz a visão → "ver no Painel" abre o recorte equivalente.

## Riscos

- Códigos das tabelas 94 e 1737 e o formato da API de malhas: confirmados no spike inicial; se divergirem, a spec é ajustada antes da implementação.
- O valor da produção sem carne bovina subestima a pecuária de RO; mitigado pelo aviso fixo até a Entrega 2.
- Exploração livre aproxima o Observatório do Painel; mitigado pelos padrões de cada bloco e pela manchete sempre presente.
