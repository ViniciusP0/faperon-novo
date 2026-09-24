# Contrato da API v1

Fonte única de verdade entre `apps/api` (Django) e `apps/web` (Next.js). O Django gera o OpenAPI a partir do código (drf-spectacular, `/api/schema/`) e o front gera os tipos TS a partir dele. Este documento define os formatos que os dois lados assumem enquanto o schema não existe.

Todas as rotas ficam sob `/api/v1/`. O Next.js faz proxy de `/api/*` para o Django. Respostas em JSON UTF-8. Erros: `{"erro": "mensagem", "campos": {"param": "detalhe"}}` com HTTP 400 (parâmetro inválido), 404 (recurso inexistente) ou 422 (combinação inválida, ex.: unidades diferentes na comparação).

Convenções:

- `produto` e `indicador` usam **slug** (ex.: `soja-em-grao`, `quantidade-produzida`), nunca id numérico.
- `municipio` usa o **código IBGE de 7 dígitos** (ex.: `1100015`).
- `inicio` e `fim` são anos inteiros. `fim` é o ano de referência do ranking. Padrão quando ausentes: `fim` = último ano com dados do recorte, `inicio` = `fim - 9`.
- Valor ausente: `valor: null` e `status` explica (`ok`, `sigiloso` para "X", `inexistente` para "-", "..." e "0" não informado). Nunca zero no lugar de ausente.
- `meta` aparece em toda resposta de dados (SPEC-08): `{"fonte": "IBGE – Pesquisa Agrícola Municipal (PAM)", "tabela_sidra": 5457, "url_fonte": "https://sidra.ibge.gov.br/Tabela/5457", "atualizado_em": "2026-09-24T14:00:00Z"}`. `atualizado_em` é a conclusão da última Carga bem-sucedida da tabela.

## Catálogo

| Endpoint | Retorno |
| --- | --- |
| `GET /api/v1/produtos?segmento=agricultura\|pecuaria&q=` | `[{"slug","nome","segmento","tabela_sidra"}]` ordenado por nome; `q` filtra por nome sem acento |
| `GET /api/v1/indicadores?produto=<slug>` | `[{"slug","nome","unidade","agregacao"}]`; `agregacao` = `soma` \| `media_ponderada` \| `nao_agregavel`; `unidade` já é a do produto |
| `GET /api/v1/municipios` | `[{"codigo_ibge","nome"}]` dos 52 municípios de RO, nome sem o sufixo " - RO" |
| `GET /api/v1/meta` | `{"ultima_carga": ISO\|null, "cargas":[{"tabela","status","concluida_em","linhas"}], "anos": {"min","max"}}` |

## Destaques da home

`GET /api/v1/destaques` retorna, numa só chamada, o resumo dos indicadores exibidos na faixa "Rondônia em números" do Início (soja, milho, café canéfora, cacau, rebanho bovino e leite). Recortes sem dados são omitidos.

```json
{
  "itens": [
    {
      "chave": "soja", "rotulo": "Soja",
      "produto": {"slug": "soja-em-grao", "nome": "Soja (em grão)", "segmento": "agricultura"},
      "indicador": {"slug": "quantidade-produzida", "nome": "Quantidade produzida", "unidade": "Toneladas", "agregacao": "soma"},
      "ano_referencia": 2024, "total": 2221610.0,
      "serie": [{"ano": 2015, "valor": 747000.0, "status": "ok"}],
      "variacao_percentual": 197.4,
      "top": [{"municipio": {"codigo_ibge": "1101468", "nome": "Pimenteiras do Oeste"}, "valor": 197220.0, "percentual_total": 8.88}],
      "meta": {}
    }
  ],
  "meta": {"atualizado_em": "2026-09-24T14:00:00Z"}
}
```

A janela da série é a padrão (10 anos até o último ano com dados). `variacao_percentual` compara o primeiro e o último ponto com valor; é `null` com menos de dois pontos. `top` traz até 5 municípios com valor `ok`.

## Consultas do painel

Parâmetros comuns: `produto`, `indicador`, `inicio`, `fim`.

`GET /api/v1/ranking` retorna:

```json
{
  "produto": {"slug": "soja-em-grao", "nome": "Soja (em grão)", "segmento": "agricultura"},
  "indicador": {"slug": "quantidade-produzida", "nome": "Quantidade produzida", "unidade": "Toneladas", "agregacao": "soma"},
  "inicio": 2015, "fim": 2024, "ano_referencia": 2024,
  "total_estadual": 1234567.0,
  "itens": [
    {"posicao": 1, "municipio": {"codigo_ibge": "1100072", "nome": "Corumbiara"}, "valor": 183546.0, "status": "ok", "percentual_total": 14.87}
  ],
  "meta": {}
}
```

Ordem: `ok` por valor decrescente (`posicao` 1..n), depois `sigiloso` (`posicao: null`, `valor: null`, exibido como "X"), depois `inexistente`. Sempre os 52 municípios. `total_estadual` é a soma para `soma`; média ponderada para `media_ponderada` (rendimento = produção ÷ área colhida do mesmo ano); `null` para `nao_agregavel`. `percentual_total` é `null` quando o total não existe ou para indicadores não somáveis.

`GET /api/v1/serie?...&municipio=` retorna `{"produto","indicador","municipio": null | {"codigo_ibge","nome"}, "inicio","fim","pontos":[{"ano","valor","status"}], "meta"}`. Sem `municipio`, o ponto é o total de RO (regra de `agregacao`); ponto sem nenhum dado vira `valor: null`.

`GET /api/v1/comparacao` aceita dois modos:

- `produto`, `indicador`, `municipios=1100015,1100023` (2 a 5 códigos) → `"modo": "municipios"`.
- `produtos=soja-em-grao,milho-em-grao` (2 a 5 slugs), `indicador`, `municipio?` opcional (sem ele, total RO) → `"modo": "produtos"`. Retorna 422 se as unidades dos produtos diferirem.

Resposta: `{"modo","indicador","unidade","inicio","fim","anos":[2015,...],"series":[{"id","nome","pontos":[{"ano","valor","status"}]}],"meta"}`.

`GET /api/v1/analise?...&municipio?` retorna:

```json
{
  "titulo": "Soja (em grão) — Quantidade produzida, 2015–2024",
  "paragrafos": ["A quantidade produzida de Soja (em grão) em Rondônia passou de ... para ... (+123,4%) ..."],
  "metricas": {
    "variacao_absoluta": 100.0, "variacao_percentual": 12.3, "cagr_percentual": 3.1,
    "maior_ano": {"ano": 2024, "valor": 1.0}, "menor_ano": {"ano": 2015, "valor": 1.0},
    "top5": [{"municipio": {"codigo_ibge": "1100072", "nome": "Corumbiara"}, "valor": 1.0, "percentual": 14.9}],
    "concentracao_top5_percentual": 55.2
  },
  "meta": {}
}
```

Métricas indisponíveis (ex.: início zero, `nao_agregavel` sem total) ficam `null` e o texto omite a frase correspondente. A análise é determinística: mesma entrada, mesmo texto.

`GET /api/v1/relatorio.pdf?...&municipios=` retorna `application/pdf` com `Content-Disposition: attachment; filename="faperon-<produto>-<indicador>-<inicio>-<fim>.pdf"`. Aceita os mesmos parâmetros da análise mais `municipios` (comparação, opcional). Cache por recorte e por Carga; rate limit por IP (429 com `Retry-After`).

## Saúde

`GET /api/v1/saude` → `{"status": "ok", "banco": "ok"}` (usado pelo healthcheck do Compose).
