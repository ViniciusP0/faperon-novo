# Observatório Agropecuário (Entrega 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `/central-de-inteligencia` como hub de duas portas e a página `/central-de-inteligencia/observatorio` com quatro blocos (Panorama, Por que cresceu, Território, Pecuária), cada um com manchete por regra, gráfico ou mapa, "como ler", filtros na URL e fonte/qualidade.

**Architecture:** A Ingestão ganha a PPM 94 (vacas ordenhadas, em `Medicao`) e o IPCA (SIDRA 1737, em `IndicePreco`). Um comando baixa a malha municipal do IBGE para um GeoJSON estático e preenche a microrregião dos municípios. Um novo app Django `observatorio` (só leitura) separa leitura do banco (`leitura.py`), cálculo puro (`calculos.py`), texto por regras (`regras.py`) e montagem dos blocos (`servico.py`), exposto em quatro endpoints GET. O Next.js só renderiza, com ECharts.

**Tech Stack:** Django 5 + DRF + drf-spectacular, PostgreSQL 16, pytest; Next.js 15 (App Router) + TypeScript, TanStack Query, ECharts 5, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-observatorio-entrega-1-design.md` · ADR: `docs/adr/0028-observatorio-como-contexto-de-leitura-com-valores-deflacionados-pelo-ipca.md`

## Global Constraints

- Textos determinísticos, sem IA: mesma entrada, mesmo texto (ADR 0007). Números em pt-BR via `analise.regras.formatar_numero`.
- Valor sigiloso ou ausente **nunca** vira zero e fica fora de totais; rendimento médio nunca é somado.
- Valores monetários do Observatório são **reais**, deflacionados pelo IPCA médio anual: `valor × indice[ano_ref] / indice[ano]`. Ano de IPCA com menos de 12 meses não é gravado.
- Deflação só a partir de **1995** (`ANO_MINIMO_DEFLACAO`): o IPCA médio de 1994 mistura meses anteriores ao Real.
- O app `observatorio` não importa nada de `ingestao` exceto o modelo `Carga` (para `meta`) e nunca chama o SIDRA.
- A malha nunca é buscada em tempo de execução: `apps/web/public/geo/ro-municipios.json` é versionado.
- Endpoints em `/api/v1/observatorio/{panorama|crescimento|territorio|pecuaria}`; parâmetro inválido → 400 `{erro, campos}`; produto inexistente → 404; recorte vazio → 200 com aviso em `qualidade.avisos`.
- Filtros do front na URL com prefixo por bloco: `pan_`, `cre_`, `ter_`, `pec_`. URL sem parâmetro = padrão do backend.
- Desempenho: cada endpoint ≤ 500 ms (p95) no notebook da demo.
- Tipos do front escritos à mão em `src/lib/api-types.ts` (padrão atual do repo; `npm run gen:api` serve para conferir).
- Commits em Conventional Commits, em português, terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (implementação) — o autor do commit usa o modelo da sessão que o fez.
- Comandos Python rodam com o código montado: `docker compose run --rm -v ./apps/api:/app api-dev <comando>` (abreviado abaixo como **`$DEV`**). Ex.: `$DEV pytest tests/test_observatorio_calculos.py -v`.

## Review Focus

1. **Ano anterior a 1995 num filtro monetário** (`pan_ano=1996&pan_janela=5` → início 1992): o período é recortado para começar em 1995 e `qualidade.avisos` diz isso; nunca deflaciona 1994. Teste em Task 8.
2. **Cultura sem área colhida no ano inicial** (cultura que começou depois do `inicio`, ou área zero): a decomposição vem `null` e a manchete explica que não há base de comparação, sem divisão por zero. Teste em Task 6 e Task 9.
3. **Município sigiloso no mapa**: aparece como "sigiloso" (cinza, rótulo na tabela), não como zero; entra em `qualidade.municipios_sigilosos`. Teste em Task 10 (backend) e Task 15 (front).
4. **URL adulterada** (`pan_janela=7`, `ter_ano=abc`): o backend responde 400 e o bloco mostra o erro com um botão "voltar ao padrão" que remove só os parâmetros daquele bloco; os outros blocos continuam funcionando. Teste em Task 14.
5. **Ano de referência sem IPCA fechado** (`pan_ano=2026` com IPCA só até 2025): `ano_ref_monetario` cai para 2025, o texto diz "a preços de 2025" e o aviso explica. Teste em Task 8.

---

## Mapa de arquivos

**Backend (`apps/api`)**

| Arquivo | Responsabilidade |
| --- | --- |
| `ingestao/tabelas.py` (mod.) | `TabelaSidra.classificacao: int \| None`, `categoria_unica`; tabela 94; `TABELA_IPCA = 1737` |
| `ingestao/sidra.py` (mod.) | `dados()` sem classificação; `serie_nacional()` |
| `ingestao/parser.py` (mod.) | `parsear_dados(..., categoria_padrao)`; `parsear_indice_mensal`, `medias_anuais` |
| `ingestao/servico.py` (mod.) | carga sem classificação |
| `ingestao/servico_indice.py` (novo) | `executar_carga_ipca(cliente)` |
| `ingestao/territorio.py` (novo) | funções puras da malha e das microrregiões |
| `ingestao/management/commands/baixar_territorio.py` (novo) | baixa malha + microrregiões |
| `ingestao/management/commands/ingest_sidra.py`, `run_scheduler.py` (mod.) | incluem 1737 |
| `ingestao/snapshot.py` (mod.) | `indices_preco` no snapshot |
| `indicadores/catalogo.py` (mod.) | indicador 107, unidade, fontes 94 e 1737 |
| `indicadores/models.py` (mod.) + migração | `IndicePreco` |
| `indicadores/aplicacao.py` (mod.) | `gravar_indices_preco` |
| `observatorio/` (novo app) | `calculos.py`, `leitura.py`, `regras.py`, `servico.py`, `api/serializers.py`, `api/views.py`, `urls.py` |
| `tests/test_ingestao_94_ipca.py`, `tests/test_territorio.py`, `tests/test_observatorio_*.py` (novos) | testes |

**Front (`apps/web`)**

| Arquivo | Responsabilidade |
| --- | --- |
| `src/lib/api-types.ts`, `src/lib/api.ts` (mod.) | tipos e cliente do Observatório |
| `src/lib/observatorio-url.ts` (novo) | filtros por bloco na URL (puro) |
| `src/lib/observatorio-graficos.ts` (novo) | `option` do ECharts de cada gráfico (puro) |
| `src/components/observatorio/` (novo) | `bloco.tsx`, `tabela-dados.tsx`, `seletor.tsx`, `mapa-municipios.tsx`, `grafico-observatorio.tsx`, `bloco-panorama.tsx`, `bloco-crescimento.tsx`, `bloco-territorio.tsx`, `bloco-pecuaria.tsx`, `consultas.ts` |
| `src/content/observatorio.ts` (novo), `src/content/central.ts` (mod.) | textos editoriais |
| `src/app/central-de-inteligencia/page.tsx` (mod.), `.../observatorio/page.tsx` (novo) | rotas |
| `src/app/sitemap.ts` (+ teste) | nova rota |
| `public/geo/ro-municipios.json` (gerado) | malha |
| `scripts/mock-api.mjs` (mod.), `e2e/observatorio.spec.ts` (novo) | E2E |
| `docs/api-contract.md` (mod.) | contrato |

---

### Task 0: Branch e spike das fontes novas

**Files:**
- Create: `apps/api/tests/fixtures/sidra_94_vacas_2023_2024.json`, `apps/api/tests/fixtures/sidra_1737_ipca_2024_2025.json`, `apps/api/tests/fixtures/ibge_malha_ro_amostra.json`, `apps/api/tests/fixtures/ibge_localidades_ro_amostra.json`
- Modify: `docs/superpowers/specs/2026-10-07-observatorio-entrega-1-design.md` (só se o spike divergir)

**Interfaces:**
- Produces: fixtures reais (recortadas) usadas nas Tasks 1, 2 e 3; confirmação de: tabela 94 sem classificação e variável **107**; tabela 1737 variável **2266** (número-índice, dez/1993 = 100), períodos `AAAAMM`; malha v3 com `properties.codarea`; localidades v1 com `microrregiao.nome`.

- [ ] **Step 1: Criar a branch a partir do commit da spec**

```bash
git switch -c feat/observatorio
```

- [ ] **Step 2: Conferir a tabela 94 e gravar a fixture**

```bash
curl -s "https://servicodados.ibge.gov.br/api/v3/agregados/94/metadados" | python -c "import json,sys;d=json.load(sys.stdin);print(d['classificacoes'],[(v['id'],v['nome'],v['unidade']) for v in d['variaveis']])"
curl -s "https://servicodados.ibge.gov.br/api/v3/agregados/94/periodos/2023|2024/variaveis/107?localidades=N6[1100015,1100023]" > apps/api/tests/fixtures/sidra_94_vacas_2023_2024.json
```

Expected: `classificacoes` = `[]`; variável `107` "Vacas ordenhadas", unidade "Cabeças". A fixture tem `resultados[0].classificacoes == []`.

- [ ] **Step 3: Conferir o IPCA e gravar a fixture**

```bash
curl -s "https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/202401-202512/variaveis/2266?localidades=N1[all]" > apps/api/tests/fixtures/sidra_1737_ipca_2024_2025.json
```

Expected: uma variável `2266`, uma série com 24 chaves `202401`…`202512`.

- [ ] **Step 4: Gravar amostras de malha e localidades**

```bash
curl -s "https://servicodados.ibge.gov.br/api/v3/malhas/estados/11?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio" | python -c "import json,sys;d=json.load(sys.stdin);d['features']=d['features'][:2];print(json.dumps(d))" > apps/api/tests/fixtures/ibge_malha_ro_amostra.json
curl -s "https://servicodados.ibge.gov.br/api/v1/localidades/estados/11/municipios" | python -c "import json,sys;print(json.dumps(json.load(sys.stdin)[:2]))" > apps/api/tests/fixtures/ibge_localidades_ro_amostra.json
```

Expected: cada feição tem `properties.codarea` (7 dígitos); cada município tem `id` e `microrregiao.nome`.

- [ ] **Step 5: Se algum código ou formato divergir**, pare, corrija a spec e os códigos das Tasks 1–3 neste plano, e avise o revisor. Se tudo bater, siga.

- [ ] **Step 6: Commit**

```bash
git add apps/api/tests/fixtures/
git commit -m "test(api): fixtures reais da PPM 94, do IPCA e das malhas do IBGE"
```

---

### Task 1: PPM 94 — tabela sem classificação

**Files:**
- Modify: `apps/api/ingestao/tabelas.py`, `apps/api/ingestao/sidra.py`, `apps/api/ingestao/parser.py`, `apps/api/ingestao/servico.py`, `apps/api/indicadores/catalogo.py`, `apps/api/ingestao/management/commands/ingest_sidra.py` (texto de ajuda), `apps/api/tests/conftest.py`
- Test: `apps/api/tests/test_ingestao_94_ipca.py`

**Interfaces:**
- Produces: produto `vacas-ordenhadas` (tabela 94, segmento pecuária) com indicador `vacas-ordenhadas` (código 107, soma, "Cabeças"); `TABELAS[94]`; `FONTES[94]`.

- [ ] **Step 1: Escrever os testes que falham**

`apps/api/tests/test_ingestao_94_ipca.py`:

```python
import pytest

from indicadores.models import Medicao, Produto
from ingestao.parser import parsear_dados
from ingestao.servico import executar_carga
from tests.conftest import ClienteFalso, carregar_fixture


def test_parser_usa_categoria_padrao_quando_nao_ha_classificacao() -> None:
    resposta = carregar_fixture("sidra_94_vacas_2023_2024.json")
    registros = list(parsear_dados(resposta, categoria_padrao=("107", "Vacas ordenhadas")))
    assert registros
    assert {r.categoria_codigo for r in registros} == {"107"}
    assert {r.variavel_codigo for r in registros} == {"107"}
    assert {r.ano for r in registros} == {2023, 2024}


def test_parser_sem_classificacao_e_sem_padrao_falha() -> None:
    resposta = carregar_fixture("sidra_94_vacas_2023_2024.json")
    with pytest.raises(ValueError, match="sem classificação"):
        list(parsear_dados(resposta))


@pytest.mark.django_db
def test_carga_da_tabela_94_cria_produto_vacas_ordenhadas() -> None:
    resposta = carregar_fixture("sidra_94_vacas_2023_2024.json")
    cliente = ClienteFalso([], {"107": resposta})
    carga = executar_carga(94, cliente)
    assert carga.status == "sucesso"
    produto = Produto.objects.get(tabela_origem=94)
    assert (produto.slug, produto.segmento) == ("vacas-ordenhadas", "pecuaria")
    assert Medicao.objects.filter(produto=produto, indicador__slug="vacas-ordenhadas").exists()
    assert cliente.chamadas == 1
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `$DEV pytest tests/test_ingestao_94_ipca.py -v`
Expected: FAIL (`parsear_dados() got an unexpected keyword argument 'categoria_padrao'`, `KeyError: 94`).

- [ ] **Step 3: Implementar**

`ingestao/tabelas.py` — substituir o dataclass e o dicionário:

```python
@dataclass(frozen=True)
class TabelaSidra:
    codigo: int
    classificacao: int | None
    variaveis: tuple[str, ...]
    segmento: str
    # Tabela sem classificação de produto: vira um único produto com este (código, nome).
    categoria_unica: tuple[str, str] | None = None


TABELAS: dict[int, TabelaSidra] = {
    5457: TabelaSidra(5457, 782, ("8331", "216", "214", "112", "215"), Segmento.AGRICULTURA),
    3939: TabelaSidra(3939, 79, ("105",), Segmento.PECUARIA),
    74: TabelaSidra(74, 80, ("106", "215"), Segmento.PECUARIA),
    94: TabelaSidra(94, None, ("107",), Segmento.PECUARIA, ("107", "Vacas ordenhadas")),
}

# IPCA (série nacional mensal): não é uma TabelaSidra; tem carga própria (ingestao/servico_indice.py).
TABELA_IPCA = 1737
VARIAVEL_IPCA = "2266"  # número-índice, base dez/1993 = 100
```

`ingestao/sidra.py` — `dados` aceita classificação ausente:

```python
    def dados(
        self, tabela: int, variaveis: tuple[str, ...], classificacao: int | None, categoria: str
    ) -> list[dict[str, Any]]:
        url = (
            f"{BASE_URL}/{tabela}/periodos/all/variaveis/{'|'.join(variaveis)}"
            f"?localidades={LOCALIDADES_RO}"
        )
        if classificacao is not None:
            url += f"&classificacao={classificacao}[{categoria}]"
        resposta = self._get(url)
        if not isinstance(resposta, list):
            raise ErroSidraDefinitivo(f"Resposta inesperada para {url}")
        return resposta
```

`ingestao/parser.py` — `parsear_dados` com categoria padrão:

```python
def parsear_dados(
    resposta: list[dict[str, Any]], categoria_padrao: tuple[str, str] | None = None
) -> Iterator[Registro]:
    for variavel in resposta:
        codigo = str(variavel["id"])
        unidade = variavel.get("unidade", "")
        for resultado in variavel["resultados"]:
            if resultado["classificacoes"]:
                categorias = resultado["classificacoes"][0]["categoria"]
                ((cat_codigo, cat_nome),) = categorias.items()
            elif categoria_padrao is not None:
                cat_codigo, cat_nome = categoria_padrao
            else:
                raise ValueError(f"Variável {codigo} veio sem classificação e sem categoria padrão")
            for serie in resultado["series"]:
                localidade = serie["localidade"]
                for ano, token in serie["serie"].items():
                    valor, status = interpretar_valor(token)
                    yield Registro(
                        variavel_codigo=codigo,
                        unidade=unidade,
                        categoria_codigo=str(cat_codigo),
                        categoria_nome=cat_nome,
                        municipio_codigo=str(localidade["id"]),
                        municipio_nome=nome_do_municipio(localidade["nome"]),
                        ano=int(ano),
                        valor=valor,
                        status=status,
                    )
```

`ingestao/servico.py` — no `Protocol`, trocar `classificacao: int` por `classificacao: int | None` em `dados`; em `executar_carga`, trocar a montagem de `categorias` e a chamada do parser:

```python
        if cfg.classificacao is None:
            assert cfg.categoria_unica is not None
            categorias = [cfg.categoria_unica]
        else:
            categorias = [
                (codigo, nome)
                for codigo, nome in cliente.categorias(tabela, cfg.classificacao)
                if codigo != CATEGORIA_TOTAL and (apenas is None or codigo in apenas)
            ]
        for codigo, nome in categorias:
            resposta = cliente.dados(tabela, cfg.variaveis, cfg.classificacao, codigo)
            hasher.update(json.dumps(resposta, sort_keys=True, separators=(",", ":")).encode())
            registros = list(parsear_dados(resposta, cfg.categoria_unica))
```

`indicadores/catalogo.py` — acrescentar ao fim da lista de `INDICADORES`:

```python
        DefinicaoIndicador("107", "vacas-ordenhadas", "Vacas ordenhadas", Agregacao.SOMA),
```

e em `UNIDADES_PADRAO`: `"107": "Cabeças",`; e em `FONTES`:

```python
    94: Fonte(
        "IBGE – Pesquisa da Pecuária Municipal (PPM)", 94, "https://sidra.ibge.gov.br/tabela/94"
    ),
    1737: Fonte("IBGE – IPCA (número-índice)", 1737, "https://sidra.ibge.gov.br/tabela/1737"),
```

`tests/conftest.py` — `ClienteFalso.categorias` e `dados` aceitam `classificacao: int | None` (só a anotação muda).

`ingest_sidra.py` — `help = "Ingere PAM (5457), PPM (3939, 74, 94) e IPCA (1737) do IBGE SIDRA para o banco."`

- [ ] **Step 4: Rodar e ver passar (e o resto da suíte)**

Run: `$DEV pytest -q`
Expected: tudo PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): ingere vacas ordenhadas (PPM 94), tabela sem classificação"
```

---

### Task 2: IPCA — `IndicePreco`, carga, agendador e snapshot

**Files:**
- Modify: `apps/api/indicadores/models.py`, `apps/api/indicadores/aplicacao.py`, `apps/api/ingestao/sidra.py`, `apps/api/ingestao/parser.py`, `apps/api/ingestao/management/commands/ingest_sidra.py`, `apps/api/ingestao/management/commands/run_scheduler.py`, `apps/api/ingestao/snapshot.py`, `apps/api/tests/conftest.py`
- Create: `apps/api/ingestao/servico_indice.py`, migração `apps/api/indicadores/migrations/00XX_indicepreco.py` (gerada)
- Test: `apps/api/tests/test_ingestao_94_ipca.py` (acrescentar)

**Interfaces:**
- Consumes: `TABELA_IPCA`, `VARIAVEL_IPCA` (Task 1).
- Produces: `indicadores.models.IndicePreco(ano: int pk, indice_medio: Decimal, carga: FK Carga)`; `ingestao.servico_indice.executar_carga_ipca(cliente, *, forcar=False) -> Carga`; `SidraCliente.serie_nacional(tabela: int, variavel: str) -> list[dict]`; `parser.parsear_indice_mensal(resposta) -> dict[int, list[Decimal]]`; `parser.medias_anuais(mensal) -> dict[int, Decimal]`.

- [ ] **Step 1: Testes que falham** (acrescentar a `test_ingestao_94_ipca.py`)

```python
from decimal import Decimal

from indicadores.models import IndicePreco
from ingestao.parser import medias_anuais, parsear_indice_mensal
from ingestao.servico_indice import executar_carga_ipca
from ingestao import snapshot


class ClienteIpca:
    def __init__(self, resposta: object) -> None:
        self.resposta = resposta
        self.chamadas = 0

    def serie_nacional(self, tabela: int, variavel: str) -> object:
        self.chamadas += 1
        return self.resposta


def test_medias_anuais_so_com_12_meses() -> None:
    mensal = {2024: [Decimal(i) for i in range(1, 13)], 2025: [Decimal(10)] * 11}
    assert medias_anuais(mensal) == {2024: Decimal("6.5")}


def test_parsear_indice_mensal_agrupa_por_ano() -> None:
    mensal = parsear_indice_mensal(carregar_fixture("sidra_1737_ipca_2024_2025.json"))
    assert sorted(mensal) == [2024, 2025]
    assert len(mensal[2024]) == 12


@pytest.mark.django_db
def test_carga_ipca_grava_medias_e_detecta_inalterada() -> None:
    cliente = ClienteIpca(carregar_fixture("sidra_1737_ipca_2024_2025.json"))
    carga = executar_carga_ipca(cliente)
    assert carga.status == "sucesso" and carga.tabela == 1737
    assert set(IndicePreco.objects.values_list("ano", flat=True)) == {2024, 2025}
    assert executar_carga_ipca(cliente).status == "inalterada"


@pytest.mark.django_db
def test_snapshot_leva_e_traz_o_ipca(tmp_path) -> None:
    executar_carga_ipca(ClienteIpca(carregar_fixture("sidra_1737_ipca_2024_2025.json")))
    antes = dict(IndicePreco.objects.values_list("ano", "indice_medio"))
    destino = tmp_path / "s.json.gz"
    snapshot.gerar(destino)
    snapshot.restaurar(destino, forcar=True)
    assert dict(IndicePreco.objects.values_list("ano", "indice_medio")) == antes
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `$DEV pytest tests/test_ingestao_94_ipca.py -v`
Expected: FAIL (`ImportError: IndicePreco`).

- [ ] **Step 3: Implementar**

`indicadores/models.py` (fim do arquivo):

```python
class IndicePreco(models.Model):
    """IPCA médio do ano (média dos 12 números-índice mensais). Ano incompleto não é gravado."""

    ano = models.PositiveSmallIntegerField(primary_key=True)
    indice_medio = models.DecimalField(max_digits=22, decimal_places=6)
    carga = models.ForeignKey("ingestao.Carga", on_delete=models.PROTECT, related_name="indices")

    class Meta:
        db_table = "dim_indice_preco"
        ordering = ["ano"]
```

Run: `$DEV python manage.py makemigrations indicadores -n indicepreco`

`indicadores/aplicacao.py` (fim do arquivo):

```python
def gravar_indices_preco(carga: Carga, medias: dict[int, Decimal]) -> int:
    """Upsert do IPCA médio anual (interface publicada do núcleo para a Ingestão)."""
    from indicadores.models import IndicePreco

    for ano, indice in medias.items():
        IndicePreco.objects.update_or_create(
            ano=ano, defaults={"indice_medio": indice, "carga": carga}
        )
    return len(medias)
```

(e `from decimal import Decimal` no topo.)

`ingestao/sidra.py` (método novo em `SidraCliente`):

```python
    def serie_nacional(self, tabela: int, variavel: str) -> list[dict[str, Any]]:
        url = f"{BASE_URL}/{tabela}/periodos/all/variaveis/{variavel}?localidades=N1[all]"
        resposta = self._get(url)
        if not isinstance(resposta, list):
            raise ErroSidraDefinitivo(f"Resposta inesperada para {url}")
        return resposta
```

`ingestao/parser.py` (fim do arquivo):

```python
MESES_NO_ANO = 12


def parsear_indice_mensal(resposta: list[dict[str, Any]]) -> dict[int, list[Decimal]]:
    """Série nacional mensal ('AAAAMM' → valor) agrupada por ano; meses sem valor são ignorados."""
    por_ano: dict[int, list[Decimal]] = {}
    for variavel in resposta:
        for resultado in variavel["resultados"]:
            for serie in resultado["series"]:
                for periodo, token in sorted(serie["serie"].items()):
                    valor, status = interpretar_valor(token)
                    if status == StatusValor.OK and valor is not None:
                        por_ano.setdefault(int(periodo[:4]), []).append(valor)
    return por_ano


def medias_anuais(mensal: dict[int, list[Decimal]]) -> dict[int, Decimal]:
    return {
        ano: sum(valores, Decimal(0)) / MESES_NO_ANO
        for ano, valores in mensal.items()
        if len(valores) == MESES_NO_ANO
    }
```

`ingestao/servico_indice.py`:

```python
"""Carga do IPCA (SIDRA 1737): série nacional mensal → média anual em IndicePreco."""

import hashlib
import json
import logging
from typing import Any, Protocol

from django.db import transaction
from django.utils import timezone

from indicadores.aplicacao import gravar_indices_preco
from ingestao.models import Carga
from ingestao.parser import medias_anuais, parsear_indice_mensal
from ingestao.servico import CargaFalhou
from ingestao.tabelas import TABELA_IPCA, VARIAVEL_IPCA

log = logging.getLogger(__name__)


class ClienteSerieNacional(Protocol):
    def serie_nacional(self, tabela: int, variavel: str) -> list[dict[str, Any]]: ...


def executar_carga_ipca(cliente: ClienteSerieNacional, *, forcar: bool = False) -> Carga:
    carga = Carga.objects.create(tabela=TABELA_IPCA, iniciada_em=timezone.now())
    try:
        resposta = cliente.serie_nacional(TABELA_IPCA, VARIAVEL_IPCA)
        digest = hashlib.sha256(
            json.dumps(resposta, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        medias = medias_anuais(parsear_indice_mensal(resposta))
        if not medias:
            raise CargaFalhou("IPCA não retornou nenhum ano completo")
        anterior = (
            Carga.objects.filter(
                tabela=TABELA_IPCA, status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA]
            )
            .exclude(pk=carga.pk)
            .exclude(hash="")
            .first()
        )
        carga.hash = digest
        carga.linhas = len(medias)
        if not forcar and anterior is not None and anterior.hash == digest:
            carga.status = Carga.Status.INALTERADA
        else:
            with transaction.atomic():
                gravar_indices_preco(carga, medias)
                carga.status = Carga.Status.SUCESSO
        carga.concluida_em = timezone.now()
        carga.save()
        return carga
    except Exception as exc:
        carga.status = Carga.Status.FALHA
        carga.erro = str(exc)[:2000]
        carga.concluida_em = timezone.now()
        carga.save()
        log.error("IPCA: carga %s falhou: %s", carga.pk, exc)
        raise exc if isinstance(exc, CargaFalhou) else CargaFalhou(str(exc)) from exc
```

`ingest_sidra.py` — `choices=sorted([*TABELAS, TABELA_IPCA])`; `tabelas = opts["tabela"] or sorted([*TABELAS, TABELA_IPCA])`; no laço:

```python
                if tabela == TABELA_IPCA:
                    carga = executar_carga_ipca(cliente, forcar=opts["forcar"])
                else:
                    carga = executar_carga(
                        tabela,
                        cliente,
                        forcar=opts["forcar"],
                        apenas=set(opts["produto"]) if opts["produto"] else None,
                    )
```

`run_scheduler.py` — `for tabela in sorted([*TABELAS, TABELA_IPCA]):` e

```python
            carga = (
                executar_carga_ipca(cliente)
                if tabela == TABELA_IPCA
                else executar_carga(tabela, cliente)
            )
```

(importar `TABELA_IPCA` de `ingestao.tabelas` e `executar_carga_ipca` de `ingestao.servico_indice` nos dois comandos.)

`ingestao/snapshot.py`:
- importar `IndicePreco`;
- em `gerar`, antes de montar `cargas`: `ids |= set(IndicePreco.objects.values_list("carga_id", flat=True))`;
- em `conteudo`: `"indices_preco": [[i[0], str(i[1]), i[2]] for i in IndicePreco.objects.order_by("ano").values_list("ano", "indice_medio", "carga_id")],`
- em `_apagar_dados`, primeira linha: `IndicePreco.objects.all().delete()`;
- em `restaurar`, depois de `ProdutoIndicador.objects.bulk_create(...)`:

```python
        IndicePreco.objects.bulk_create(
            [
                IndicePreco(ano=i[0], indice_medio=i[1], carga_id=i[2])
                for i in dados.get("indices_preco", [])
            ]
        )
```

(snapshot antigo sem a chave continua carregando.)

- [ ] **Step 4: Rodar a suíte**

Run: `$DEV pytest -q && $DEV ruff check . && $DEV mypy .`
Expected: PASS, sem erros de lint/tipo.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): ingere o IPCA médio anual (SIDRA 1737) para deflacionar valores"
```

---

### Task 3: Território — malha GeoJSON e microrregiões

**Files:**
- Create: `apps/api/ingestao/territorio.py`, `apps/api/ingestao/management/commands/baixar_territorio.py`, `apps/web/public/geo/ro-municipios.json` (gerado)
- Test: `apps/api/tests/test_territorio.py`

**Interfaces:**
- Produces: `normalizar_malha(geojson: dict, codigos_esperados: set[str]) -> dict` (feições só com `properties.codigo_ibge`; levanta `ErroTerritorio` se o conjunto de códigos divergir); `microrregioes(localidades: list[dict]) -> dict[str, str]`; `Municipio.microrregiao` preenchido nos 52; arquivo `public/geo/ro-municipios.json`.

- [ ] **Step 1: Testes que falham**

`apps/api/tests/test_territorio.py`:

```python
import pytest

from ingestao.territorio import ErroTerritorio, microrregioes, normalizar_malha
from tests.conftest import carregar_fixture


def test_normalizar_malha_troca_codarea_por_codigo_ibge() -> None:
    geo = carregar_fixture("ibge_malha_ro_amostra.json")
    codigos = {f["properties"]["codarea"] for f in geo["features"]}
    saida = normalizar_malha(geo, codigos)
    assert {f["properties"]["codigo_ibge"] for f in saida["features"]} == codigos
    assert all(set(f["properties"]) == {"codigo_ibge"} for f in saida["features"])


def test_normalizar_malha_recusa_codigos_diferentes_do_cadastro() -> None:
    geo = carregar_fixture("ibge_malha_ro_amostra.json")
    with pytest.raises(ErroTerritorio, match="faltam"):
        normalizar_malha(geo, {"1100015", "1100023", "1199999"})


def test_microrregioes_por_codigo() -> None:
    locs = carregar_fixture("ibge_localidades_ro_amostra.json")
    mapa = microrregioes(locs)
    assert set(mapa) == {str(m["id"]) for m in locs}
    assert all(mapa.values())
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `$DEV pytest tests/test_territorio.py -v` → FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Implementar**

`ingestao/territorio.py`:

```python
"""Malha municipal e microrregiões de RO (API de malhas v3 e de localidades v1 do IBGE)."""

from typing import Any

URL_MALHA = (
    "https://servicodados.ibge.gov.br/api/v3/malhas/estados/11"
    "?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio"
)
URL_LOCALIDADES = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/11/municipios"


class ErroTerritorio(Exception):
    pass


def normalizar_malha(geojson: dict[str, Any], codigos_esperados: set[str]) -> dict[str, Any]:
    feicoes = []
    for f in geojson["features"]:
        codigo = str(f["properties"]["codarea"])
        feicoes.append({"type": "Feature", "properties": {"codigo_ibge": codigo}, "geometry": f["geometry"]})
    obtidos = {f["properties"]["codigo_ibge"] for f in feicoes}
    if obtidos != codigos_esperados:
        faltam = sorted(codigos_esperados - obtidos)
        sobram = sorted(obtidos - codigos_esperados)
        raise ErroTerritorio(f"Malha diferente do cadastro: faltam {faltam}, sobram {sobram}")
    feicoes.sort(key=lambda f: f["properties"]["codigo_ibge"])
    return {"type": "FeatureCollection", "features": feicoes}


def microrregioes(localidades: list[dict[str, Any]]) -> dict[str, str]:
    return {str(m["id"]): m["microrregiao"]["nome"] for m in localidades}
```

`ingestao/management/commands/baixar_territorio.py`:

```python
import json
from pathlib import Path
from typing import Any

import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from indicadores.models import Municipio
from ingestao.territorio import (
    URL_LOCALIDADES,
    URL_MALHA,
    ErroTerritorio,
    microrregioes,
    normalizar_malha,
)

TIMEOUT = 60


class Command(BaseCommand):
    help = "Baixa a malha municipal de RO (GeoJSON do front) e preenche a microrregião dos municípios."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--destino", required=True, help="caminho do GeoJSON de saída")

    def handle(self, *args: Any, **opts: Any) -> None:
        codigos = set(Municipio.objects.values_list("codigo_ibge", flat=True))
        if len(codigos) != 52:
            raise CommandError(f"Cadastro tem {len(codigos)} municípios; rode a ingestão antes")
        try:
            malha = normalizar_malha(requests.get(URL_MALHA, timeout=TIMEOUT).json(), codigos)
            micro = microrregioes(requests.get(URL_LOCALIDADES, timeout=TIMEOUT).json())
        except (requests.RequestException, ValueError, ErroTerritorio) as exc:
            raise CommandError(str(exc)) from exc
        if set(micro) != codigos:
            raise CommandError("Localidades do IBGE diferentes do cadastro de municípios")
        destino = Path(opts["destino"])
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(json.dumps(malha, separators=(",", ":")), encoding="utf-8")
        with transaction.atomic():
            for codigo, nome in micro.items():
                Municipio.objects.filter(codigo_ibge=codigo).update(microrregiao=nome)
        self.stdout.write(self.style.SUCCESS(f"{destino}: {len(malha['features'])} municípios"))
```

- [ ] **Step 4: Testes passam**

Run: `$DEV pytest tests/test_territorio.py -v` → PASS.

- [ ] **Step 5: Gerar a malha, preencher microrregiões e ingerir 94 + IPCA no banco local; regenerar o snapshot**

```bash
docker compose up -d --build api
docker compose run --rm -v ./apps/api:/app -v ./apps/web/public/geo:/saida api-dev python manage.py baixar_territorio --destino /saida/ro-municipios.json
docker compose run --rm -v ./apps/api:/app api-dev python manage.py ingest_sidra --tabela 94 --tabela 1737
make snapshot
```

Expected: `ro-municipios.json` com 52 feições (< 300 KB); `tabela 94: sucesso`, `tabela 1737: sucesso`; `Municipio.objects.filter(microrregiao="").count() == 0`.

- [ ] **Step 6: Commit**

```bash
git add apps/api apps/web/public/geo/ro-municipios.json data/seed
git commit -m "feat(api): malha municipal de RO versionada e microrregiões dos municípios"
```

---

### Task 4: App `observatorio` — esqueleto e `calculos.py`

**Files:**
- Create: `apps/api/observatorio/__init__.py`, `apps/api/observatorio/apps.py`, `apps/api/observatorio/calculos.py`
- Modify: `apps/api/config/settings.py` (`INSTALLED_APPS` += `"observatorio"`)
- Test: `apps/api/tests/test_observatorio_calculos.py`

**Interfaces:**
- Produces (todas puras, `Decimal` dentro e fora):
  - `ANO_MINIMO_DEFLACAO = 1995`
  - `deflacionar(valor: Decimal | None, ano: int, ano_ref: int, indices: Mapping[int, Decimal]) -> Decimal | None`
  - `@dataclass Decomposicao(variacao_producao_pct: Decimal, parte_area_pct: Decimal | None, parte_rendimento_pct: Decimal | None, estavel: bool)`
  - `decompor_crescimento(area_ini, area_fim, prod_ini, prod_fim) -> Decomposicao | None`
  - `perda_lavoura(plantada, colhida) -> Decimal | None`
  - `valor_por_hectare(valor_mil_reais, area_ha) -> Decimal | None` (R$/ha)
  - `participacoes(valores: Mapping[str, Decimal]) -> dict[str, Decimal]` (% do total)
  - `hhi(valores: Mapping[str, Decimal]) -> Decimal | None`
  - `top_com_demais(valores: Mapping[str, Decimal], n: int = 8) -> list[tuple[str, Decimal]]` (chave `"demais"` no fim, se houver)
  - `cultura_dominante(valores: Mapping[str, Decimal]) -> str | None`
  - `dependencia(valores: Mapping[str, Decimal], limiar: Decimal = Decimal(50)) -> tuple[str, Decimal] | None`
  - `somar_por_grupo(valores: Mapping[str, Decimal], grupo_de: Mapping[str, str]) -> dict[str, Decimal]`
  - `indice_base_100(serie: Sequence[tuple[int, Decimal | None]]) -> list[tuple[int, Decimal | None]]`
  - `produtividade_leite(mil_litros, vacas) -> Decimal | None` (litros/vaca/ano)

- [ ] **Step 1: Testes que falham**

`apps/api/tests/test_observatorio_calculos.py`:

```python
from decimal import Decimal as D

import pytest

from observatorio import calculos as c


def test_deflacionar_leva_ao_ano_de_referencia() -> None:
    indices = {2014: D(4000), 2024: D(6000)}
    assert c.deflacionar(D(100), 2014, 2024, indices) == D(150)
    assert c.deflacionar(D(100), 2024, 2024, indices) == D(100)


@pytest.mark.parametrize("ano", [1994, 2030])
def test_deflacionar_sem_indice_ou_antes_de_1995_devolve_none(ano: int) -> None:
    assert c.deflacionar(D(100), ano, 2024, {1994: D(1), 2024: D(2)}) is None


def test_deflacionar_valor_ausente() -> None:
    assert c.deflacionar(None, 2024, 2024, {2024: D(1)}) is None


def test_decomposicao_soma_100() -> None:
    d = c.decompor_crescimento(D(100), D(110), D(300), D(660))
    assert d is not None and not d.estavel
    assert d.variacao_producao_pct == D(120)
    assert d.parte_area_pct is not None and d.parte_rendimento_pct is not None
    assert abs(d.parte_area_pct + d.parte_rendimento_pct - D(100)) < D("0.0001")
    assert d.parte_rendimento_pct > d.parte_area_pct


def test_decomposicao_com_forcas_opostas_ainda_soma_100() -> None:
    d = c.decompor_crescimento(D(100), D(150), D(100), D(120))  # área sobe, rendimento cai
    assert d is not None and d.parte_rendimento_pct is not None and d.parte_rendimento_pct < 0
    assert abs(d.parte_area_pct + d.parte_rendimento_pct - D(100)) < D("0.0001")


@pytest.mark.parametrize(
    "args", [(D(0), D(1), D(1), D(1)), (None, D(1), D(1), D(1)), (D(1), D(1), D(-1), D(1))]
)
def test_decomposicao_sem_base_devolve_none(args: tuple) -> None:
    assert c.decompor_crescimento(*args) is None


def test_decomposicao_estavel_nao_divide() -> None:
    d = c.decompor_crescimento(D(100), D(100), D(500), D(500))
    assert d is not None and d.estavel and d.parte_area_pct is None


def test_perda_e_valor_por_hectare() -> None:
    assert c.perda_lavoura(D(200), D(150)) == D(25)
    assert c.perda_lavoura(D(0), D(0)) is None
    assert c.perda_lavoura(None, D(1)) is None
    assert c.valor_por_hectare(D(30), D(10)) == D(3000)
    assert c.valor_por_hectare(D(30), D(0)) is None


def test_participacoes_hhi_e_top() -> None:
    v = {"a": D(50), "b": D(30), "c": D(20)}
    assert c.participacoes(v) == {"a": D(50), "b": D(30), "c": D(20)}
    assert c.hhi(v) == D(3800)
    assert c.hhi({}) is None
    assert c.top_com_demais(v, n=2) == [("a", D(50)), ("b", D(30)), ("demais", D(20))]
    assert c.top_com_demais(v, n=3) == [("a", D(50)), ("b", D(30)), ("c", D(20))]


def test_dominante_com_empate_e_dependencia() -> None:
    assert c.cultura_dominante({"soja": D(10), "cafe": D(10)}) == "cafe"
    assert c.cultura_dominante({}) is None
    assert c.dependencia({"soja": D(60), "milho": D(40)}) == ("soja", D(60))
    assert c.dependencia({"soja": D(50), "milho": D(50)}) is None


def test_somar_por_grupo_ignora_sem_grupo() -> None:
    assert c.somar_por_grupo({"1": D(1), "2": D(2), "3": D(3)}, {"1": "A", "2": "A", "3": ""}) == {"A": D(3)}


def test_indice_base_100() -> None:
    assert c.indice_base_100([(2020, D(50)), (2021, None), (2022, D(75))]) == [
        (2020, D(100)), (2021, None), (2022, D(150))
    ]
    assert c.indice_base_100([(2020, None), (2021, D(5))]) == [(2020, None), (2021, None)]


def test_produtividade_leite() -> None:
    assert c.produtividade_leite(D(3000), D(1000)) == D(3000)  # 3.000 mil L / 1.000 vacas
    assert c.produtividade_leite(D(1), D(0)) is None
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_calculos.py -v` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

`observatorio/__init__.py`: vazio. `observatorio/apps.py`:

```python
from django.apps import AppConfig


class ObservatorioConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "observatorio"
```

`config/settings.py`: acrescentar `"observatorio",` depois de `"analise",`.

`observatorio/calculos.py`:

```python
"""Cálculos puros do Observatório: sem banco, sem IBGE. Sigiloso/ausente chega como None e nunca vira zero."""

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from decimal import Decimal

CEM = Decimal(100)
ANO_MINIMO_DEFLACAO = 1995  # o IPCA médio de 1994 mistura meses anteriores ao Real
LIMIAR_ESTAVEL_LN = 0.001
LIMIAR_DEPENDENCIA = Decimal(50)
DEMAIS = "demais"


def deflacionar(
    valor: Decimal | None, ano: int, ano_ref: int, indices: Mapping[int, Decimal]
) -> Decimal | None:
    if valor is None or ano < ANO_MINIMO_DEFLACAO or ano not in indices or ano_ref not in indices:
        return None
    return valor * indices[ano_ref] / indices[ano]


@dataclass(frozen=True)
class Decomposicao:
    variacao_producao_pct: Decimal
    parte_area_pct: Decimal | None
    parte_rendimento_pct: Decimal | None
    estavel: bool


def _positivos(*valores: Decimal | None) -> bool:
    return all(v is not None and v > 0 for v in valores)


def decompor_crescimento(
    area_ini: Decimal | None,
    area_fim: Decimal | None,
    prod_ini: Decimal | None,
    prod_fim: Decimal | None,
) -> Decomposicao | None:
    """ln(P1/P0) = ln(A1/A0) + ln(R1/R0), com R = P/A. As duas partes somam 100%."""
    if not _positivos(area_ini, area_fim, prod_ini, prod_fim):
        return None
    assert area_ini and area_fim and prod_ini and prod_fim
    variacao = (prod_fim - prod_ini) / prod_ini * CEM
    ln_p = math.log(prod_fim / prod_ini)
    if abs(ln_p) < LIMIAR_ESTAVEL_LN:
        return Decomposicao(variacao, None, None, True)
    parte_area = Decimal(str(math.log(area_fim / area_ini) / ln_p)) * CEM
    return Decomposicao(variacao, parte_area, CEM - parte_area, False)


def perda_lavoura(plantada: Decimal | None, colhida: Decimal | None) -> Decimal | None:
    if plantada is None or colhida is None or plantada <= 0:
        return None
    return (plantada - colhida) / plantada * CEM


def valor_por_hectare(valor_mil_reais: Decimal | None, area_ha: Decimal | None) -> Decimal | None:
    if valor_mil_reais is None or area_ha is None or area_ha <= 0:
        return None
    return valor_mil_reais * 1000 / area_ha


def participacoes(valores: Mapping[str, Decimal]) -> dict[str, Decimal]:
    total = sum(valores.values(), Decimal(0))
    if total <= 0:
        return {}
    return {k: v / total * CEM for k, v in valores.items()}


def hhi(valores: Mapping[str, Decimal]) -> Decimal | None:
    partes = participacoes(valores)
    return sum((p * p for p in partes.values()), Decimal(0)) if partes else None


def top_com_demais(valores: Mapping[str, Decimal], n: int = 8) -> list[tuple[str, Decimal]]:
    ordenados = sorted(valores.items(), key=lambda kv: (-kv[1], kv[0]))
    topo, resto = ordenados[:n], ordenados[n:]
    if resto:
        topo.append((DEMAIS, sum((v for _, v in resto), Decimal(0))))
    return topo


def cultura_dominante(valores: Mapping[str, Decimal]) -> str | None:
    if not valores:
        return None
    return min(valores.items(), key=lambda kv: (-kv[1], kv[0]))[0]


def dependencia(
    valores: Mapping[str, Decimal], limiar: Decimal = LIMIAR_DEPENDENCIA
) -> tuple[str, Decimal] | None:
    for chave, parte in participacoes(valores).items():
        if parte > limiar:
            return chave, parte
    return None


def somar_por_grupo(valores: Mapping[str, Decimal], grupo_de: Mapping[str, str]) -> dict[str, Decimal]:
    """Só para indicadores de soma (todas as métricas do Território são somas)."""
    saida: dict[str, Decimal] = {}
    for chave, valor in valores.items():
        grupo = grupo_de.get(chave, "")
        if grupo:
            saida[grupo] = saida.get(grupo, Decimal(0)) + valor
    return saida


def indice_base_100(serie: Sequence[tuple[int, Decimal | None]]) -> list[tuple[int, Decimal | None]]:
    base = serie[0][1] if serie else None
    if base is None or base <= 0:
        return [(ano, None) for ano, _ in serie]
    return [(ano, None if v is None else v / base * CEM) for ano, v in serie]


def produtividade_leite(mil_litros: Decimal | None, vacas: Decimal | None) -> Decimal | None:
    if mil_litros is None or vacas is None or vacas <= 0:
        return None
    return mil_litros * 1000 / vacas
```

- [ ] **Step 4: Rodar** — `$DEV pytest tests/test_observatorio_calculos.py -v && $DEV ruff check observatorio && $DEV mypy observatorio` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/observatorio apps/api/config/settings.py apps/api/tests/test_observatorio_calculos.py
git commit -m "feat(api): cálculos puros do Observatório (deflação, decomposição, concentração)"
```

---

### Task 5: `leitura.py` — consultas ao modelo de leitura

**Files:**
- Create: `apps/api/observatorio/leitura.py`
- Test: `apps/api/tests/test_observatorio_leitura.py`, fixture nova `dados_observatorio` em `apps/api/tests/conftest.py`

**Interfaces:**
- Consumes: `Medicao`, `Produto`, `Municipio`, `IndicePreco` (Task 2).
- Produces:
  - `indices_ipca() -> dict[int, Decimal]`
  - `ultimo_ano(indicador: str, tabela: int) -> int | None` (último ano com algum valor OK)
  - `anos_disponiveis(indicador: str, tabela: int) -> list[int]` (crescente)
  - `totais_por_produto(indicador: str, tabela: int, inicio: int, fim: int) -> dict[str, dict[int, Decimal]]` (slug → ano → soma dos OK)
  - `por_municipio(indicador: str, tabela: int, ano: int, produto: str | None = None) -> dict[str, Decimal]` (soma dos OK por município; `produto=None` soma todos os produtos da tabela)
  - `por_municipio_e_produto(indicador: str, tabela: int, ano: int) -> dict[str, dict[str, Decimal]]`
  - `sigilosos(indicador: str, tabela: int, ano: int, produto: str | None = None) -> int` (municípios distintos com status sigiloso)
  - `produtos(tabela: int) -> dict[str, str]` (slug → nome, ordenado por nome)
  - `municipios() -> list[tuple[str, str, str]]` (código, nome, microrregião)
  - `atualizado_em(tabelas: Sequence[int]) -> datetime | None`

- [ ] **Step 1: Fixture e testes que falham**

Em `tests/conftest.py`, acrescentar:

```python
@pytest.fixture
def dados_observatorio(municipios: list[Municipio], carga: Carga) -> dict[str, Produto]:
    """PAM: soja e café em 2 anos; PPM: bovino, leite e vacas. Cabixi sigiloso na soja 2024."""
    from indicadores.models import IndicePreco

    garantir_indicadores()

    def produto(slug: str, nome: str, tabela: int, segmento: str, codigo: str) -> Produto:
        return Produto.objects.create(
            slug=slug, codigo_ibge=codigo, nome=nome, segmento=segmento, tabela_origem=tabela
        )

    soja = produto("soja-em-grao", "Soja (em grão)", 5457, "agricultura", "40124")
    cafe = produto("cafe-em-grao-canephora", "Café canéfora", 5457, "agricultura", "40139")
    bovino = produto("bovino", "Bovino", 3939, "pecuaria", "2670")
    leite = produto("leite", "Leite", 74, "pecuaria", "2682")
    vacas = produto("vacas-ordenhadas", "Vacas ordenhadas", 94, "pecuaria", "107")
    unidades = {
        "area-plantada": "Hectares", "area-colhida": "Hectares",
        "quantidade-produzida": "Toneladas", "valor-da-producao": "Mil Reais",
    }
    for p in (soja, cafe):
        for slug, unidade in unidades.items():
            ProdutoIndicador.objects.create(produto=p, indicador=Indicador.objects.get(slug=slug), unidade=unidade)
    ProdutoIndicador.objects.create(produto=bovino, indicador=Indicador.objects.get(slug="efetivo"), unidade="Cabeças")
    ProdutoIndicador.objects.create(produto=leite, indicador=Indicador.objects.get(slug="producao-de-origem-animal"), unidade="Mil litros")
    ProdutoIndicador.objects.create(produto=leite, indicador=Indicador.objects.get(slug="valor-da-producao"), unidade="Mil Reais")
    ProdutoIndicador.objects.create(produto=vacas, indicador=Indicador.objects.get(slug="vacas-ordenhadas"), unidade="Cabeças")

    af, ari, cab, cac = "1100015", "1100023", "1100031", "1100049"
    # (produto, indicador, município, ano, valor)
    linhas = [
        (soja, "area-plantada", af, 2015, 110), (soja, "area-colhida", af, 2015, 100),
        (soja, "quantidade-produzida", af, 2015, 300), (soja, "valor-da-producao", af, 2015, 400),
        (soja, "area-plantada", af, 2024, 120), (soja, "area-colhida", af, 2024, 110),
        (soja, "quantidade-produzida", af, 2024, 660), (soja, "valor-da-producao", af, 2024, 1200),
        (soja, "area-colhida", ari, 2024, 1000), (soja, "quantidade-produzida", ari, 2024, 3000),
        (soja, "valor-da-producao", ari, 2024, 3000),
        (cafe, "area-plantada", ari, 2015, 50), (cafe, "area-colhida", ari, 2015, 50),
        (cafe, "quantidade-produzida", ari, 2015, 50), (cafe, "valor-da-producao", ari, 2015, 200),
        (cafe, "area-plantada", ari, 2024, 50), (cafe, "area-colhida", ari, 2024, 50),
        (cafe, "quantidade-produzida", ari, 2024, 100), (cafe, "valor-da-producao", ari, 2024, 600),
        (cafe, "area-colhida", cac, 2024, 2000), (cafe, "valor-da-producao", cac, 2024, 900),
        (bovino, "efetivo", af, 2015, 1000), (bovino, "efetivo", af, 2024, 1500),
        (bovino, "efetivo", ari, 2024, 500),
        (leite, "producao-de-origem-animal", af, 2015, 1000), (leite, "producao-de-origem-animal", af, 2024, 2000),
        (leite, "valor-da-producao", af, 2015, 100), (leite, "valor-da-producao", af, 2024, 300),
        (vacas, "vacas-ordenhadas", af, 2015, 1000), (vacas, "vacas-ordenhadas", af, 2024, 800),
    ]
    for p, ind, mun, ano, valor in linhas:
        lancar(p, ind, mun, ano, valor, carga)
    lancar(soja, "valor-da-producao", cab, 2024, None, carga, "sigiloso")
    for ano, indice in {2015: "4000", 2024: "6000", 2025: "6300"}.items():
        IndicePreco.objects.create(ano=ano, indice_medio=Decimal(indice), carga=carga)
    Municipio.objects.filter(codigo_ibge__in=[af, ari]).update(microrregiao="Cacoal")
    Municipio.objects.filter(codigo_ibge__in=[cab, cac]).update(microrregiao="Vilhena")
    atualizar_views()
    return {"soja": soja, "cafe": cafe, "bovino": bovino, "leite": leite, "vacas": vacas}
```

`apps/api/tests/test_observatorio_leitura.py`:

```python
from decimal import Decimal as D

import pytest

from observatorio import leitura as l

pytestmark = pytest.mark.django_db


def test_ipca_e_anos(dados_observatorio: dict) -> None:
    assert l.indices_ipca() == {2015: D(4000), 2024: D(6000), 2025: D(6300)}
    assert l.ultimo_ano("valor-da-producao", 5457) == 2024
    assert l.anos_disponiveis("valor-da-producao", 5457) == [2015, 2024]


def test_totais_por_produto_ignoram_sigiloso(dados_observatorio: dict) -> None:
    t = l.totais_por_produto("valor-da-producao", 5457, 2015, 2024)
    assert t["soja-em-grao"] == {2015: D(400), 2024: D(4200)}
    assert t["cafe-em-grao-canephora"] == {2015: D(200), 2024: D(1500)}


def test_por_municipio(dados_observatorio: dict) -> None:
    assert l.por_municipio("valor-da-producao", 5457, 2024) == {
        "1100015": D(1200), "1100023": D(3600), "1100049": D(900)
    }
    assert l.por_municipio("valor-da-producao", 5457, 2024, "soja-em-grao") == {
        "1100015": D(1200), "1100023": D(3000)
    }
    assert l.por_municipio_e_produto("valor-da-producao", 5457, 2024)["1100023"] == {
        "soja-em-grao": D(3000), "cafe-em-grao-canephora": D(600)
    }


def test_sigilosos_produtos_e_municipios(dados_observatorio: dict) -> None:
    assert l.sigilosos("valor-da-producao", 5457, 2024) == 1
    assert l.sigilosos("valor-da-producao", 5457, 2024, "cafe-em-grao-canephora") == 0
    assert list(l.produtos(5457)) == ["cafe-em-grao-canephora", "soja-em-grao"]
    assert ("1100015", "Alta Floresta D'Oeste", "Cacoal") in l.municipios()
    assert l.atualizado_em([5457]) is not None
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_leitura.py -v` → FAIL.

- [ ] **Step 3: Implementar** `observatorio/leitura.py`:

```python
"""Leitura do modelo de Indicadores para o Observatório. Só consultas; nenhum cálculo de negócio."""

from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from django.db.models import Max, QuerySet, Sum

from indicadores.models import IndicePreco, Medicao, Municipio, Produto, StatusValor
from ingestao.models import Carga


def _ok(indicador: str, tabela: int) -> QuerySet[Medicao]:
    return Medicao.objects.filter(
        indicador__slug=indicador, produto__tabela_origem=tabela, status_valor=StatusValor.OK
    )


def indices_ipca() -> dict[int, Decimal]:
    return dict(IndicePreco.objects.values_list("ano", "indice_medio"))


def ultimo_ano(indicador: str, tabela: int) -> int | None:
    ano = _ok(indicador, tabela).aggregate(m=Max("ano"))["m"]
    return None if ano is None else int(ano)


def anos_disponiveis(indicador: str, tabela: int) -> list[int]:
    return sorted(int(a) for a in _ok(indicador, tabela).values_list("ano", flat=True).distinct())


def totais_por_produto(indicador: str, tabela: int, inicio: int, fim: int) -> dict[str, dict[int, Decimal]]:
    saida: dict[str, dict[int, Decimal]] = {}
    linhas = (
        _ok(indicador, tabela)
        .filter(ano__range=(inicio, fim))
        .values("produto__slug", "ano")
        .annotate(total=Sum("valor"))
    )
    for linha in linhas:
        saida.setdefault(linha["produto__slug"], {})[int(linha["ano"])] = linha["total"]
    return saida


def por_municipio(indicador: str, tabela: int, ano: int, produto: str | None = None) -> dict[str, Decimal]:
    qs = _ok(indicador, tabela).filter(ano=ano)
    if produto:
        qs = qs.filter(produto__slug=produto)
    return {m: t for m, t in qs.values("municipio_id").annotate(t=Sum("valor")).values_list("municipio_id", "t")}


def por_municipio_e_produto(indicador: str, tabela: int, ano: int) -> dict[str, dict[str, Decimal]]:
    saida: dict[str, dict[str, Decimal]] = {}
    for mun, slug, valor in _ok(indicador, tabela).filter(ano=ano).values_list("municipio_id", "produto__slug", "valor"):
        saida.setdefault(mun, {})[slug] = valor
    return saida


def sigilosos(indicador: str, tabela: int, ano: int, produto: str | None = None) -> int:
    qs = Medicao.objects.filter(
        indicador__slug=indicador, produto__tabela_origem=tabela, ano=ano, status_valor=StatusValor.SIGILOSO
    )
    if produto:
        qs = qs.filter(produto__slug=produto)
    return qs.values("municipio_id").distinct().count()


def produtos(tabela: int) -> dict[str, str]:
    return dict(Produto.objects.filter(tabela_origem=tabela).order_by("nome").values_list("slug", "nome"))


def municipios() -> list[tuple[str, str, str]]:
    return list(Municipio.objects.order_by("nome").values_list("codigo_ibge", "nome", "microrregiao"))


def atualizado_em(tabelas: Sequence[int]) -> datetime | None:
    return (
        Carga.objects.filter(tabela__in=tabelas, status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA])
        .aggregate(m=Max("concluida_em"))["m"]
    )
```

- [ ] **Step 4: Rodar** — `$DEV pytest tests/test_observatorio_leitura.py -v && $DEV mypy observatorio` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/observatorio/leitura.py apps/api/tests/conftest.py apps/api/tests/test_observatorio_leitura.py
git commit -m "feat(api): leitura agregada do modelo de indicadores para o Observatório"
```

---

### Task 6: `regras.py` — manchetes e "como ler"

**Files:**
- Create: `apps/api/observatorio/regras.py`
- Test: `apps/api/tests/test_observatorio_regras.py`

**Interfaces:**
- Consumes: `analise.regras.formatar_numero`, `analise.regras.classificar_concentracao`, `analise.tendencia.tendencia_linear`, `observatorio.calculos.Decomposicao`.
- Produces (todas puras, devolvem `str` ou `list[str]`):
  - `LIMIAR_ESTABILIDADE_PP = Decimal(1)`
  - `manchete_panorama(ano: int, ano_ref: int, lider: str, participacao: Decimal, delta_pp: Decimal | None, maior_delta_pp: Decimal | None) -> str`
  - `manchete_crescimento(cultura: str, inicio: int, fim: int, d: Decomposicao | None) -> str`
  - `manchete_territorio(metrica: str, ano: int, top5_pct: Decimal | None, polo: str | None, dependentes: int) -> str`
  - `manchete_pecuaria(rebanho: str, inicio: int, fim: int, variacao_pct: Decimal | None, polo: str | None, var_produtividade_pct: Decimal | None) -> str`
  - `como_ler(bloco: str, ano_ref: int | None) -> list[str]`
  - `AVISO_SEM_CARNE`, `aviso_ano_ref(pedido: int, usado: int) -> str`, `aviso_inicio_recortado(pedido: int, usado: int) -> str`, `AVISO_SEM_DADOS`

- [ ] **Step 1: Golden tests que falham**

`apps/api/tests/test_observatorio_regras.py`:

```python
from decimal import Decimal as D

from observatorio import regras as r
from observatorio.calculos import Decomposicao


def test_manchete_panorama_com_mudanca() -> None:
    assert r.manchete_panorama(2024, 2024, "Soja (em grão)", D("38.2"), D("2.1"), D("2.1")) == (
        "Em 2024, Soja (em grão) respondeu por 38,2% do valor da produção agropecuária de Rondônia, "
        "+2,1 p.p. em relação ao início do período."
    )


def test_manchete_panorama_estavel() -> None:
    assert r.manchete_panorama(2024, 2024, "Soja (em grão)", D("38.2"), D("0.3"), D("0.8")) == (
        "Em 2024, Soja (em grão) respondeu por 38,2% do valor da produção agropecuária de Rondônia; "
        "a composição ficou estável no período (nenhum item variou 1 p.p. ou mais)."
    )


def test_manchete_crescimento_produtividade() -> None:
    d = Decomposicao(D(120), D("11.9"), D("88.1"), False)
    assert r.manchete_crescimento("Soja (em grão)", 2015, 2024, d) == (
        "A produção de Soja (em grão) cresceu 120,0% entre 2015 e 2024; "
        "88,1% desse aumento veio de ganho de produtividade e 11,9% de expansão de área."
    )


def test_manchete_crescimento_queda_e_sem_base() -> None:
    queda = Decomposicao(D(-20), D("30"), D("70"), False)
    assert r.manchete_crescimento("Café canéfora", 2015, 2024, queda) == (
        "A produção de Café canéfora caiu 20,0% entre 2015 e 2024, puxada principalmente pela queda de produtividade."
    )
    assert r.manchete_crescimento("Café canéfora", 2015, 2024, None) == (
        "Não há base de comparação para Café canéfora entre 2015 e 2024: "
        "falta área colhida ou produção em um dos anos."
    )


def test_manchete_territorio() -> None:
    assert r.manchete_territorio("valor", 2024, D("72.5"), "Ariquemes", 3) == (
        "Em 2024, os cinco maiores municípios concentraram 72,5% do valor da produção (concentração alta); "
        "Ariquemes é o principal polo. 3 municípios dependem de uma só cultura para mais da metade do valor agrícola."
    )


def test_manchete_pecuaria() -> None:
    assert r.manchete_pecuaria("Bovino", 2015, 2024, D("100"), "Alta Floresta D'Oeste", D("150")) == (
        "O rebanho bovino cresceu 100,0% entre 2015 e 2024; Alta Floresta D'Oeste é o principal polo. "
        "A produtividade do leite variou +150,0% no período."
    )


def test_avisos_e_como_ler() -> None:
    assert r.aviso_ano_ref(2026, 2025) == (
        "O IPCA de 2026 ainda não está fechado; os valores estão a preços de 2025."
    )
    assert r.aviso_inicio_recortado(1992, 1995) == (
        "O período começa em 1995: antes do Plano Real não há como corrigir valores pelo IPCA."
    )
    for bloco in ("panorama", "crescimento", "territorio", "pecuaria"):
        assert 2 <= len(r.como_ler(bloco, 2024)) <= 3
    assert "a preços de 2024" in " ".join(r.como_ler("panorama", 2024))
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_regras.py -v` → FAIL.

- [ ] **Step 3: Implementar** `observatorio/regras.py`:

```python
"""Textos do Observatório por regras determinísticas (ADR 0007): mesma entrada, mesmo texto."""

from decimal import Decimal

from analise.regras import classificar_concentracao, formatar_numero
from observatorio.calculos import Decomposicao

LIMIAR_ESTABILIDADE_PP = Decimal(1)
NOMES_METRICA = {
    "valor": "do valor da produção",
    "area": "da área colhida",
    "rebanho": "do rebanho bovino",
    "dominante": "do valor da produção",
}
AVISO_SEM_CARNE = (
    "O valor da produção soma lavouras (PAM) e produtos de origem animal (PPM); "
    "não inclui carne bovina nem abate, que a PPM não publica."
)
AVISO_SEM_DADOS = "Não há dados publicados pelo IBGE para este recorte."


def _pct(v: Decimal, sinal: bool = False) -> str:
    prefixo = "+" if sinal and v > 0 else ""
    return f"{prefixo}{formatar_numero(v, 1)}%"


def _pp(v: Decimal) -> str:
    return f"{'+' if v > 0 else ''}{formatar_numero(v, 1)} p.p."


def manchete_panorama(
    ano: int, ano_ref: int, lider: str, participacao: Decimal,
    delta_pp: Decimal | None, maior_delta_pp: Decimal | None,
) -> str:
    base = f"Em {ano}, {lider} respondeu por {_pct(participacao)} do valor da produção agropecuária de Rondônia"
    if maior_delta_pp is not None and abs(maior_delta_pp) < LIMIAR_ESTABILIDADE_PP:
        return base + "; a composição ficou estável no período (nenhum item variou 1 p.p. ou mais)."
    if delta_pp is None:
        return base + "."
    return base + f", {_pp(delta_pp)} em relação ao início do período."


def manchete_crescimento(cultura: str, inicio: int, fim: int, d: Decomposicao | None) -> str:
    if d is None:
        return (
            f"Não há base de comparação para {cultura} entre {inicio} e {fim}: "
            "falta área colhida ou produção em um dos anos."
        )
    if d.estavel or d.parte_area_pct is None or d.parte_rendimento_pct is None:
        return f"A produção de {cultura} ficou estável entre {inicio} e {fim}."
    if d.variacao_producao_pct > 0:
        return (
            f"A produção de {cultura} cresceu {_pct(d.variacao_producao_pct)} entre {inicio} e {fim}; "
            f"{_pct(d.parte_rendimento_pct)} desse aumento veio de ganho de produtividade "
            f"e {_pct(d.parte_area_pct)} de expansão de área."
        )
    causa = "queda de produtividade" if d.parte_rendimento_pct >= d.parte_area_pct else "redução de área"
    return (
        f"A produção de {cultura} caiu {_pct(abs(d.variacao_producao_pct))} entre {inicio} e {fim}, "
        f"puxada principalmente pela {causa}."
    )


def manchete_territorio(
    metrica: str, ano: int, top5_pct: Decimal | None, polo: str | None, dependentes: int
) -> str:
    if top5_pct is None or polo is None:
        return AVISO_SEM_DADOS
    texto = (
        f"Em {ano}, os cinco maiores municípios concentraram {_pct(top5_pct)} {NOMES_METRICA[metrica]} "
        f"(concentração {classificar_concentracao(top5_pct)}); {polo} é o principal polo."
    )
    if dependentes:
        texto += (
            f" {dependentes} municípios dependem de uma só cultura para mais da metade do valor agrícola."
            if dependentes > 1
            else " 1 município depende de uma só cultura para mais da metade do valor agrícola."
        )
    return texto


def manchete_pecuaria(
    rebanho: str, inicio: int, fim: int, variacao_pct: Decimal | None,
    polo: str | None, var_produtividade_pct: Decimal | None,
) -> str:
    if variacao_pct is None or polo is None:
        return AVISO_SEM_DADOS
    verbo = "cresceu" if variacao_pct > 0 else "caiu" if variacao_pct < 0 else "ficou estável"
    texto = f"O rebanho {rebanho.lower()} {verbo}"
    if variacao_pct != 0:
        texto += f" {_pct(abs(variacao_pct))}"
    texto += f" entre {inicio} e {fim}; {polo} é o principal polo."
    if var_produtividade_pct is not None:
        texto += f" A produtividade do leite variou {_pct(var_produtividade_pct, sinal=True)} no período."
    return texto


def como_ler(bloco: str, ano_ref: int | None) -> list[str]:
    precos = f"a preços de {ano_ref}" if ano_ref else "sem correção monetária"
    textos = {
        "panorama": [
            f"Os valores estão corrigidos pelo IPCA médio anual e expressos {precos}; "
            "assim, a variação mostrada é real, não efeito da inflação.",
            "O retângulo de cada item é proporcional à sua participação no valor total do ano. "
            "Mudanças de participação mostram para onde a economia agrícola do estado está se deslocando.",
        ],
        "crescimento": [
            "A produção cresce porque a área colhida aumenta, porque cada hectare rende mais, ou pelos dois. "
            "A decomposição separa as duas contribuições, que somam 100%.",
            "Crescimento puxado por produtividade indica ganho tecnológico; puxado por área, "
            "indica expansão da fronteira agrícola.",
            f"A perda de lavoura é a parte da área plantada que não foi colhida; o valor por hectare está {precos}.",
        ],
        "territorio": [
            "O mapa mostra onde a produção acontece. Cores mais escuras indicam valores maiores; "
            "municípios em cinza não têm dado publicado ou têm dado sigiloso.",
            "A concentração mede quanto do total está nos cinco maiores municípios. O índice HHI vai de 0 "
            "(produção espalhada) a 10.000 (tudo em um município).",
            "Município dependente é aquele em que uma única cultura passa de 50% do valor agrícola: "
            "uma quebra de safra ou de preço dessa cultura afeta toda a economia local.",
        ],
        "pecuaria": [
            "O efetivo é o número de cabeças em 31 de dezembro de cada ano, segundo a PPM do IBGE.",
            "A produtividade do leite é o volume anual dividido pelo número de vacas ordenhadas: "
            "mostra se o estado produz mais leite por animal, e não só com mais animais.",
        ],
    }
    return textos[bloco]


def aviso_ano_ref(pedido: int, usado: int) -> str:
    return f"O IPCA de {pedido} ainda não está fechado; os valores estão a preços de {usado}."


def aviso_inicio_recortado(pedido: int, usado: int) -> str:
    return f"O período começa em {usado}: antes do Plano Real não há como corrigir valores pelo IPCA."
```

- [ ] **Step 4: Rodar** — `$DEV pytest tests/test_observatorio_regras.py -v` → PASS (ajuste só o texto que divergir por formatação, mantendo a frase dos testes como contrato).

- [ ] **Step 5: Commit**

```bash
git add apps/api/observatorio/regras.py apps/api/tests/test_observatorio_regras.py
git commit -m "feat(api): manchetes e textos explicativos do Observatório por regras"
```

---

### Task 7: Base da API do Observatório (serializers comuns, URLs, parâmetros)

**Files:**
- Create: `apps/api/observatorio/api/__init__.py`, `apps/api/observatorio/api/serializers.py`, `apps/api/observatorio/api/views.py`, `apps/api/observatorio/urls.py`, `apps/api/observatorio/servico.py`
- Modify: `apps/api/config/urls.py`
- Test: `apps/api/tests/test_observatorio_api.py`

**Interfaces:**
- Produces:
  - `servico.referencia_monetaria(ano: int, indices: dict[int, Decimal]) -> tuple[int | None, list[str]]` — devolve o ano de referência (o próprio `ano` se houver IPCA fechado; senão o maior ano com IPCA ≤ `ano`, ou o maior ano disponível) e os avisos.
  - `servico.meta(tabelas: list[int]) -> dict` — `{"fontes": [{fonte, tabela_sidra, url_fonte}], "atualizado_em": str | None}`.
  - Serializers comuns: `TextoSerializer(manchete: str, como_ler: list[str])`, `QualidadeSerializer(municipios_sigilosos: int, ano_ref_monetario: int|null, avisos: list[str])`, `MetaObservatorioSerializer`, `ItemValorSerializer(slug, nome, valor: float|null, participacao: float|null)`, `AnoValorSerializer(ano, valor: float|null)`, `OpcaoSerializer(slug, nome)`.
  - Rotas `observatorio/panorama|crescimento|territorio|pecuaria` incluídas sob `api/v1/`.

- [ ] **Step 1: Teste que falha**

`apps/api/tests/test_observatorio_api.py`:

```python
from decimal import Decimal as D

import pytest
from rest_framework.test import APIClient

from observatorio.servico import referencia_monetaria

pytestmark = pytest.mark.django_db


def test_referencia_monetaria() -> None:
    indices = {2024: D(1), 2025: D(2)}
    assert referencia_monetaria(2024, indices) == (2024, [])
    ano, avisos = referencia_monetaria(2026, indices)
    assert ano == 2025 and avisos == ["O IPCA de 2026 ainda não está fechado; os valores estão a preços de 2025."]
    assert referencia_monetaria(2024, {}) == (None, [])


def test_rotas_existem_no_schema(api: APIClient) -> None:
    schema = api.get("/api/schema/").content.decode()
    for bloco in ("panorama", "crescimento", "territorio", "pecuaria"):
        assert f"/api/v1/observatorio/{bloco}" in schema
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_api.py -v` → FAIL.

- [ ] **Step 3: Implementar**

`observatorio/api/__init__.py`: vazio.

`observatorio/servico.py` (início; as funções de bloco entram nas Tasks 8–11):

```python
"""Monta cada bloco do Observatório: lê (leitura), calcula (calculos) e escreve (regras)."""

from decimal import Decimal
from typing import Any

from indicadores.catalogo import FONTES
from indicadores.servicos import formatar_data
from observatorio import leitura
from observatorio import regras as r


def referencia_monetaria(ano: int, indices: dict[int, Decimal]) -> tuple[int | None, list[str]]:
    if not indices:
        return None, []
    if ano in indices:
        return ano, []
    anteriores = [a for a in indices if a <= ano]
    usado = max(anteriores) if anteriores else max(indices)
    return usado, [r.aviso_ano_ref(ano, usado)]


def meta(tabelas: list[int]) -> dict[str, Any]:
    return {
        "fontes": [
            {"fonte": FONTES[t].nome, "tabela_sidra": t, "url_fonte": FONTES[t].url} for t in tabelas
        ],
        "atualizado_em": formatar_data(leitura.atualizado_em(tabelas)),
    }


def f(valor: Decimal | None, casas: int = 2) -> float | None:
    """Decimal → float arredondado para a resposta (None continua None)."""
    return None if valor is None else round(float(valor), casas)
```

`observatorio/api/serializers.py` (comuns; os de cada bloco entram nas Tasks 8–11):

```python
from rest_framework import serializers


class TextoSerializer(serializers.Serializer):
    manchete = serializers.CharField()
    como_ler = serializers.ListField(child=serializers.CharField())


class QualidadeSerializer(serializers.Serializer):
    municipios_sigilosos = serializers.IntegerField()
    ano_ref_monetario = serializers.IntegerField(allow_null=True)
    avisos = serializers.ListField(child=serializers.CharField())


class FonteSerializer(serializers.Serializer):
    fonte = serializers.CharField()
    tabela_sidra = serializers.IntegerField()
    url_fonte = serializers.URLField()


class MetaObservatorioSerializer(serializers.Serializer):
    fontes = FonteSerializer(many=True)
    atualizado_em = serializers.CharField(allow_null=True)


class OpcaoSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()


class ItemValorSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()
    valor = serializers.FloatField(allow_null=True)
    participacao = serializers.FloatField(allow_null=True)


class AnoValorSerializer(serializers.Serializer):
    ano = serializers.IntegerField()
    valor = serializers.FloatField(allow_null=True)


class MunicipioValorSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    valor = serializers.FloatField(allow_null=True)
```

`observatorio/api/views.py` (as views ficam completas nas Tasks 8–11; aqui as quatro classes respondem 501 para o schema existir):

```python
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class PanoramaView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)


class CrescimentoView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)


class TerritorioView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)


class PecuariaView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)
```

`observatorio/urls.py`:

```python
from django.urls import path

from observatorio.api import views

urlpatterns = [
    path("observatorio/panorama", views.PanoramaView.as_view()),
    path("observatorio/crescimento", views.CrescimentoView.as_view()),
    path("observatorio/territorio", views.TerritorioView.as_view()),
    path("observatorio/pecuaria", views.PecuariaView.as_view()),
]
```

`config/urls.py`: acrescentar `path("api/v1/", include("observatorio.urls")),` depois da linha de `analise.urls`.

- [ ] **Step 4: Rodar** — `$DEV pytest tests/test_observatorio_api.py -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/observatorio apps/api/config/urls.py apps/api/tests/test_observatorio_api.py
git commit -m "feat(api): rotas e contratos comuns da API do Observatório"
```

---

### Task 8: Bloco Panorama

**Files:**
- Modify: `apps/api/observatorio/servico.py`, `apps/api/observatorio/api/serializers.py`, `apps/api/observatorio/api/views.py`
- Test: `apps/api/tests/test_observatorio_api.py` (acrescentar)

**Interfaces:**
- Consumes: `leitura.totais_por_produto`, `leitura.ultimo_ano`, `leitura.anos_disponiveis`, `leitura.produtos`, `leitura.indices_ipca`, `leitura.sigilosos`; `calculos.deflacionar`, `participacoes`, `top_com_demais`, `ANO_MINIMO_DEFLACAO`; `regras.manchete_panorama`, `como_ler`, `AVISO_SEM_CARNE`, `aviso_inicio_recortado`, `AVISO_SEM_DADOS`.
- Produces: `servico.panorama(ano: int | None, janela: int) -> dict` e `GET /api/v1/observatorio/panorama?ano=&janela=` com:

```
{
  filtros: { valores: {ano, janela, inicio}, opcoes: {anos: [int], janelas: [5,10,20]} },
  metricas: { valor_total_real, valor_lavouras_real, valor_origem_animal_real, variacao_real_pct, area_colhida_ha },
  series: {
    composicao: [ItemValor],                      // top 8 + "demais", valor real do ano (mil R$)
    evolucao: { anos: [int], itens: [{slug, nome, valores: [float|null]}] }  // mesmos itens, ano a ano
  },
  texto, qualidade, meta (tabelas 5457, 74, 1737)
}
```

Regras: itens = produtos da 5457 (valor-da-producao) + produtos da 74 (valor-da-producao), chaves `slug`; `inicio = max(ano - janela + 1, ANO_MINIMO_DEFLACAO)` (aviso se recortado); `ano` fora de `anos_disponiveis` → `ConsultaInvalida` (400) com campo `ano`; `janela` fora de {5,10,20} → 400 (serializer `ChoiceField`).

- [ ] **Step 1: Testes que falham** (acrescentar)

```python
def get(api: APIClient, caminho: str) -> tuple[int, dict]:
    resposta = api.get(f"/api/v1/observatorio/{caminho}")
    return resposta.status_code, resposta.json()


def test_panorama_padrao(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "panorama")
    assert status == 200
    assert corpo["filtros"]["valores"] == {"ano": 2024, "janela": 10, "inicio": 2015}
    # 2024: soja 4200 + café 1500 + leite 300 = 6000 (preços de 2024)
    assert corpo["metricas"]["valor_total_real"] == 6000.0
    assert corpo["metricas"]["valor_origem_animal_real"] == 300.0
    # 2015 deflacionado: (400+200+100) * 6000/4000 = 1050 → variação real 471,43%
    assert corpo["metricas"]["variacao_real_pct"] == pytest.approx(471.43, abs=0.01)
    assert corpo["series"]["composicao"][0]["slug"] == "soja-em-grao"
    assert corpo["series"]["composicao"][0]["participacao"] == 70.0
    assert corpo["series"]["evolucao"]["anos"] == list(range(2015, 2025))
    assert corpo["texto"]["manchete"].startswith("Em 2024, Soja (em grão) respondeu por 70,0%")
    assert "não inclui carne bovina" in " ".join(corpo["qualidade"]["avisos"])
    assert corpo["qualidade"]["municipios_sigilosos"] == 1
    assert corpo["qualidade"]["ano_ref_monetario"] == 2024
    assert [f["tabela_sidra"] for f in corpo["meta"]["fontes"]] == [5457, 74, 1737]


def test_panorama_recorta_inicio_antes_de_1995(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "panorama?ano=2015&janela=20")
    assert status == 200
    assert corpo["filtros"]["valores"]["inicio"] == 1995
    assert any("1995" in a for a in corpo["qualidade"]["avisos"])


@pytest.mark.parametrize("qs", ["janela=7", "ano=abc", "ano=1990"])
def test_panorama_parametros_invalidos(api: APIClient, dados_observatorio: dict, qs: str) -> None:
    status, corpo = get(api, f"panorama?{qs}")
    assert status == 400 and corpo["campos"]


def test_panorama_sem_dados(api: APIClient, db: None) -> None:
    status, corpo = get(api, "panorama")
    assert status == 200
    assert corpo["series"]["composicao"] == []
    assert corpo["texto"]["manchete"] == "Não há dados publicados pelo IBGE para este recorte."
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_api.py -k panorama -v` → FAIL (501).

- [ ] **Step 3: Implementar**

`servico.py` (acrescentar; importar `from indicadores.erros import ConsultaInvalida` e `from observatorio import calculos as c`):

```python
VALOR = "valor-da-producao"
TABELAS_VALOR = (5457, 74)
JANELAS = (5, 10, 20)


def _vazio(bloco: str, filtros: dict[str, Any], tabelas: list[int], ano_ref: int | None = None) -> dict[str, Any]:
    return {
        "filtros": filtros,
        "metricas": {},
        "series": {},
        "texto": {"manchete": r.AVISO_SEM_DADOS, "como_ler": r.como_ler(bloco, ano_ref)},
        "qualidade": {"municipios_sigilosos": 0, "ano_ref_monetario": ano_ref, "avisos": [r.AVISO_SEM_DADOS]},
        "meta": meta(tabelas),
    }


def _validar_ano(ano: int, disponiveis: list[int]) -> None:
    if ano not in disponiveis:
        raise ConsultaInvalida(
            f"Não há dados para {ano}", {"ano": f"use um ano entre {disponiveis[0]} e {disponiveis[-1]}"}
        )


def panorama(ano: int | None, janela: int) -> dict[str, Any]:
    tabelas = [5457, 74, 1737]
    anos = leitura.anos_disponiveis(VALOR, 5457)
    if not anos:
        return _vazio("panorama", {"valores": {"ano": None, "janela": janela, "inicio": None},
                                   "opcoes": {"anos": [], "janelas": list(JANELAS)}}, tabelas)
    ano = anos[-1] if ano is None else ano
    _validar_ano(ano, anos)
    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(ano, indices)
    avisos.insert(0, r.AVISO_SEM_CARNE)
    inicio = ano - janela + 1
    if inicio < c.ANO_MINIMO_DEFLACAO:
        avisos.append(r.aviso_inicio_recortado(inicio, c.ANO_MINIMO_DEFLACAO))
        inicio = c.ANO_MINIMO_DEFLACAO

    nomes: dict[str, str] = {}
    reais: dict[str, dict[int, Decimal]] = {}
    origem_animal: set[str] = set()
    for tabela in TABELAS_VALOR:
        nomes |= leitura.produtos(tabela)
        for slug, por_ano in leitura.totais_por_produto(VALOR, tabela, inicio, ano).items():
            reais[slug] = {
                a: v for a, valor in por_ano.items()
                if ano_ref is not None and (v := c.deflacionar(valor, a, ano_ref, indices)) is not None
            }
            if tabela == 74:
                origem_animal.add(slug)

    no_ano = {s: v[ano] for s, v in reais.items() if ano in v}
    no_inicio = {s: v[inicio] for s, v in reais.items() if inicio in v}
    if not no_ano:
        return _vazio("panorama", {"valores": {"ano": ano, "janela": janela, "inicio": inicio},
                                   "opcoes": {"anos": anos, "janelas": list(JANELAS)}}, tabelas, ano_ref)
    total = sum(no_ano.values(), Decimal(0))
    total_ini = sum(no_inicio.values(), Decimal(0))
    partes = c.participacoes(no_ano)
    partes_ini = c.participacoes(no_inicio)
    topo = c.top_com_demais(no_ano)
    chaves_topo = [s for s, _ in topo if s != c.DEMAIS]

    def nome(slug: str) -> str:
        return "Demais produtos" if slug == c.DEMAIS else nomes[slug]

    composicao = [
        {"slug": s, "nome": nome(s), "valor": f(v), "participacao": f(v / total * 100, 1)} for s, v in topo
    ]
    anos_janela = list(range(inicio, ano + 1))
    evolucao_itens = [
        {"slug": s, "nome": nome(s), "valores": [f(reais[s].get(a)) for a in anos_janela]} for s in chaves_topo
    ]
    if any(s == c.DEMAIS for s, _ in topo):
        resto = [s for s in reais if s not in chaves_topo]
        evolucao_itens.append({
            "slug": c.DEMAIS, "nome": nome(c.DEMAIS),
            "valores": [f(sum((reais[s].get(a, Decimal(0)) for s in resto), Decimal(0))) for a in anos_janela],
        })

    lider = chaves_topo[0]
    deltas = {s: partes[s] - partes_ini[s] for s in partes if s in partes_ini}
    maior_delta = max(deltas.values(), key=abs) if deltas else None
    area = sum(leitura.por_municipio("area-colhida", 5457, ano).values(), Decimal(0))
    return {
        "filtros": {"valores": {"ano": ano, "janela": janela, "inicio": inicio},
                    "opcoes": {"anos": anos, "janelas": list(JANELAS)}},
        "metricas": {
            "valor_total_real": f(total),
            "valor_lavouras_real": f(sum((v for s, v in no_ano.items() if s not in origem_animal), Decimal(0))),
            "valor_origem_animal_real": f(sum((v for s, v in no_ano.items() if s in origem_animal), Decimal(0))),
            "variacao_real_pct": f((total - total_ini) / total_ini * 100) if total_ini > 0 else None,
            "area_colhida_ha": f(area, 0),
        },
        "series": {"composicao": composicao, "evolucao": {"anos": anos_janela, "itens": evolucao_itens}},
        "texto": {
            "manchete": r.manchete_panorama(ano, ano_ref or ano, nomes[lider], partes[lider], deltas.get(lider), maior_delta),
            "como_ler": r.como_ler("panorama", ano_ref),
        },
        "qualidade": {
            "municipios_sigilosos": leitura.sigilosos(VALOR, 5457, ano),
            "ano_ref_monetario": ano_ref,
            "avisos": avisos,
        },
        "meta": meta(tabelas),
    }
```

`api/serializers.py` (acrescentar):

```python
class ConsultaPanoramaSerializer(serializers.Serializer):
    ano = serializers.IntegerField(required=False)
    janela = serializers.ChoiceField(choices=[5, 10, 20], required=False, default=10)


class SerieItemSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()
    valores = serializers.ListField(child=serializers.FloatField(allow_null=True))


class EvolucaoSerializer(serializers.Serializer):
    anos = serializers.ListField(child=serializers.IntegerField())
    itens = SerieItemSerializer(many=True)


class PanoramaValoresSerializer(serializers.Serializer):
    ano = serializers.IntegerField(allow_null=True)
    janela = serializers.IntegerField()
    inicio = serializers.IntegerField(allow_null=True)


class PanoramaOpcoesSerializer(serializers.Serializer):
    anos = serializers.ListField(child=serializers.IntegerField())
    janelas = serializers.ListField(child=serializers.IntegerField())


class PanoramaFiltrosSerializer(serializers.Serializer):
    valores = PanoramaValoresSerializer()
    opcoes = PanoramaOpcoesSerializer()


class PanoramaMetricasSerializer(serializers.Serializer):
    valor_total_real = serializers.FloatField(required=False, allow_null=True)
    valor_lavouras_real = serializers.FloatField(required=False, allow_null=True)
    valor_origem_animal_real = serializers.FloatField(required=False, allow_null=True)
    variacao_real_pct = serializers.FloatField(required=False, allow_null=True)
    area_colhida_ha = serializers.FloatField(required=False, allow_null=True)


class PanoramaSeriesSerializer(serializers.Serializer):
    composicao = ItemValorSerializer(many=True, required=False)
    evolucao = EvolucaoSerializer(required=False)


class PanoramaSerializer(serializers.Serializer):
    filtros = PanoramaFiltrosSerializer()
    metricas = PanoramaMetricasSerializer()
    series = PanoramaSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()
```

`api/views.py` — substituir `PanoramaView`:

```python
from drf_spectacular.utils import extend_schema

from indicadores.api.parametros import validar_consulta
from indicadores.api.views import ERROS
from observatorio import servico
from observatorio.api import serializers as sz


class PanoramaView(APIView):
    @extend_schema(parameters=[sz.ConsultaPanoramaSerializer], responses={200: sz.PanoramaSerializer, **ERROS})
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaPanoramaSerializer, request)
        return Response(sz.PanoramaSerializer(servico.panorama(d.get("ano"), int(d["janela"]))).data)
```

Nota: `_vazio` devolve `series: {}`; os campos de `PanoramaSeriesSerializer` são `required=False`, então `composicao` sai ausente. No teste de "sem dados", trocar a asserção por `assert corpo["series"].get("composicao", []) == []`.

- [ ] **Step 4: Rodar** — `$DEV pytest tests/test_observatorio_api.py -k panorama -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/observatorio apps/api/tests/test_observatorio_api.py
git commit -m "feat(api): bloco Panorama do Observatório com valores reais e composição"
```

---

### Task 9: Bloco Por que cresceu

**Files:**
- Modify: `apps/api/observatorio/servico.py`, `apps/api/observatorio/api/serializers.py`, `apps/api/observatorio/api/views.py`
- Test: `apps/api/tests/test_observatorio_api.py` (acrescentar)

**Interfaces:**
- Produces: `servico.crescimento(cultura: str | None, inicio: int | None, fim: int | None) -> dict` e `GET /api/v1/observatorio/crescimento?cultura=&inicio=&fim=`:

```
filtros: { valores: {cultura, inicio, fim}, opcoes: {culturas: [Opcao], anos: [int]} }
metricas: { variacao_producao_pct, parte_area_pct, parte_rendimento_pct, perda_media_pct, perda_ultimo_ano_pct }
series: {
  indices: { anos: [int], area: [float|null], rendimento: [float|null], producao: [float|null] },  // base 100 no início
  perda: [AnoValor],
  valor_por_hectare: [ItemValor]    // culturas com área colhida ≥ 1.000 ha no fim; R$/ha a preços de ano_ref
}
```

Regras: padrão de `cultura` = maior valor da produção (5457) no último ano; `fim` padrão = último ano com área colhida da cultura; `inicio` padrão = `fim - 9`; `inicio > fim` → 400; cultura inexistente na 5457 → `NaoEncontrado` (404). Rendimento da série = produção ÷ área (estadual), nunca média de rendimentos.

- [ ] **Step 1: Testes que falham**

```python
def test_crescimento_padrao_e_decomposicao(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "crescimento")
    assert status == 200
    v = corpo["filtros"]["valores"]
    assert v == {"cultura": "soja-em-grao", "inicio": 2015, "fim": 2024}
    m = corpo["metricas"]
    # soja: área 100→1110, produção 300→3660
    assert m["parte_area_pct"] + m["parte_rendimento_pct"] == pytest.approx(100, abs=0.01)
    assert m["perda_ultimo_ano_pct"] == pytest.approx((120 - 110) / 120 * 100, abs=0.01)
    assert corpo["series"]["indices"]["producao"][0] == 100.0
    assert [i["slug"] for i in corpo["series"]["valor_por_hectare"]] == ["cafe-em-grao-canephora", "soja-em-grao"] or \
        [i["slug"] for i in corpo["series"]["valor_por_hectare"]] == ["soja-em-grao", "cafe-em-grao-canephora"]


def test_crescimento_sem_base_no_inicio(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=2016&fim=2024")
    assert status == 200
    assert corpo["metricas"]["parte_area_pct"] is None
    assert corpo["texto"]["manchete"].startswith("Não há base de comparação")


def test_crescimento_erros(api: APIClient, dados_observatorio: dict) -> None:
    assert get(api, "crescimento?cultura=inexistente")[0] == 404
    assert get(api, "crescimento?inicio=2024&fim=2015")[0] == 400
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_api.py -k crescimento -v` → FAIL.

- [ ] **Step 3: Implementar**

`servico.py` (acrescentar; importar `NaoEncontrado`):

```python
AREA_MINIMA_RANKING = Decimal(1000)


def _estadual(indicador: str, slug: str, inicio: int, fim: int) -> dict[int, Decimal]:
    return leitura.totais_por_produto(indicador, 5457, inicio, fim).get(slug, {})


def crescimento(cultura: str | None, inicio: int | None, fim: int | None) -> dict[str, Any]:
    tabelas = [5457, 1737]
    culturas = leitura.produtos(5457)
    anos = leitura.anos_disponiveis("area-colhida", 5457)
    opcoes = {"culturas": [{"slug": s, "nome": n} for s, n in culturas.items()], "anos": anos}
    if not anos:
        return _vazio("crescimento", {"valores": {"cultura": cultura, "inicio": inicio, "fim": fim}, "opcoes": opcoes}, tabelas)
    if cultura is None:
        valores = leitura.totais_por_produto(VALOR, 5457, anos[-1], anos[-1])
        cultura = max(valores, key=lambda s: (valores[s].get(anos[-1], Decimal(0)), s)) if valores else next(iter(culturas))
    if cultura not in culturas:
        raise NaoEncontrado(f"Cultura '{cultura}' não existe")
    fim = fim if fim is not None else anos[-1]
    inicio = inicio if inicio is not None else fim - 9
    if inicio > fim:
        raise ConsultaInvalida("O ano inicial não pode ser maior que o ano final", {"inicio": "maior que fim"})

    area = _estadual("area-colhida", cultura, inicio, fim)
    plantada = _estadual("area-plantada", cultura, inicio, fim)
    producao = _estadual("quantidade-produzida", cultura, inicio, fim)
    anos_janela = list(range(inicio, fim + 1))
    rendimento = {a: producao[a] / area[a] for a in anos_janela if a in producao and area.get(a)}
    d = c.decompor_crescimento(area.get(inicio), area.get(fim), producao.get(inicio), producao.get(fim))
    perdas = [(a, c.perda_lavoura(plantada.get(a), area.get(a))) for a in anos_janela]
    perdas_ok = [p for _, p in perdas if p is not None]

    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(fim, indices)
    valores_fim = leitura.totais_por_produto(VALOR, 5457, fim, fim)
    areas_fim = leitura.totais_por_produto("area-colhida", 5457, fim, fim)
    rph = []
    for slug, nome in culturas.items():
        a = areas_fim.get(slug, {}).get(fim)
        real = c.deflacionar(valores_fim.get(slug, {}).get(fim), fim, ano_ref, indices) if ano_ref else None
        vph = c.valor_por_hectare(real, a) if a is not None and a >= AREA_MINIMA_RANKING else None
        if vph is not None:
            rph.append({"slug": slug, "nome": nome, "valor": f(vph, 0), "participacao": None})
    rph.sort(key=lambda i: (-(i["valor"] or 0), i["slug"]))

    def serie_indice(dados: dict[int, Decimal]) -> list[float | None]:
        return [f(v) for _, v in c.indice_base_100([(a, dados.get(a)) for a in anos_janela])]

    return {
        "filtros": {"valores": {"cultura": cultura, "inicio": inicio, "fim": fim}, "opcoes": opcoes},
        "metricas": {
            "variacao_producao_pct": f(d.variacao_producao_pct) if d else None,
            "parte_area_pct": f(d.parte_area_pct) if d else None,
            "parte_rendimento_pct": f(d.parte_rendimento_pct) if d else None,
            "perda_media_pct": f(sum(perdas_ok, Decimal(0)) / len(perdas_ok)) if perdas_ok else None,
            "perda_ultimo_ano_pct": f(perdas[-1][1]),
        },
        "series": {
            "indices": {"anos": anos_janela, "area": serie_indice(area),
                        "rendimento": serie_indice(rendimento), "producao": serie_indice(producao)},
            "perda": [{"ano": a, "valor": f(p)} for a, p in perdas],
            "valor_por_hectare": rph,
        },
        "texto": {"manchete": r.manchete_crescimento(culturas[cultura], inicio, fim, d),
                  "como_ler": r.como_ler("crescimento", ano_ref)},
        "qualidade": {"municipios_sigilosos": leitura.sigilosos("quantidade-produzida", 5457, fim, cultura),
                      "ano_ref_monetario": ano_ref, "avisos": avisos},
        "meta": meta(tabelas),
    }
```

`api/serializers.py` (acrescentar):

```python
class ConsultaCrescimentoSerializer(serializers.Serializer):
    cultura = serializers.SlugField(required=False)
    inicio = serializers.IntegerField(required=False, min_value=1974)
    fim = serializers.IntegerField(required=False, min_value=1974)


class CrescimentoValoresSerializer(serializers.Serializer):
    cultura = serializers.CharField(allow_null=True)
    inicio = serializers.IntegerField(allow_null=True)
    fim = serializers.IntegerField(allow_null=True)


class CrescimentoOpcoesSerializer(serializers.Serializer):
    culturas = OpcaoSerializer(many=True)
    anos = serializers.ListField(child=serializers.IntegerField())


class CrescimentoFiltrosSerializer(serializers.Serializer):
    valores = CrescimentoValoresSerializer()
    opcoes = CrescimentoOpcoesSerializer()


class CrescimentoMetricasSerializer(serializers.Serializer):
    variacao_producao_pct = serializers.FloatField(required=False, allow_null=True)
    parte_area_pct = serializers.FloatField(required=False, allow_null=True)
    parte_rendimento_pct = serializers.FloatField(required=False, allow_null=True)
    perda_media_pct = serializers.FloatField(required=False, allow_null=True)
    perda_ultimo_ano_pct = serializers.FloatField(required=False, allow_null=True)


class IndicesSerializer(serializers.Serializer):
    anos = serializers.ListField(child=serializers.IntegerField())
    area = serializers.ListField(child=serializers.FloatField(allow_null=True))
    rendimento = serializers.ListField(child=serializers.FloatField(allow_null=True))
    producao = serializers.ListField(child=serializers.FloatField(allow_null=True))


class CrescimentoSeriesSerializer(serializers.Serializer):
    indices = IndicesSerializer(required=False)
    perda = AnoValorSerializer(many=True, required=False)
    valor_por_hectare = ItemValorSerializer(many=True, required=False)


class CrescimentoSerializer(serializers.Serializer):
    filtros = CrescimentoFiltrosSerializer()
    metricas = CrescimentoMetricasSerializer()
    series = CrescimentoSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()
```

`api/views.py` — substituir `CrescimentoView`:

```python
class CrescimentoView(APIView):
    @extend_schema(parameters=[sz.ConsultaCrescimentoSerializer], responses={200: sz.CrescimentoSerializer, **ERROS})
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaCrescimentoSerializer, request)
        return Response(sz.CrescimentoSerializer(servico.crescimento(d.get("cultura"), d.get("inicio"), d.get("fim"))).data)
```

No teste de `valor_por_hectare`, troque a asserção dupla por `assert {i["slug"] for i in corpo["series"]["valor_por_hectare"]} == {"soja-em-grao", "cafe-em-grao-canephora"}` (soja 1110 ha, café 2050 ha no fim, ambos ≥ 1.000).

- [ ] **Step 4: Rodar** — `$DEV pytest tests/test_observatorio_api.py -k crescimento -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/observatorio apps/api/tests/test_observatorio_api.py
git commit -m "feat(api): bloco Por que cresceu (área x produtividade, perda e R$/ha)"
```

---

### Task 10: Bloco Território

**Files:**
- Modify: `apps/api/observatorio/servico.py`, `apps/api/observatorio/api/serializers.py`, `apps/api/observatorio/api/views.py`
- Test: `apps/api/tests/test_observatorio_api.py` (acrescentar)

**Interfaces:**
- Produces: `servico.territorio(metrica: str, cultura: str | None, ano: int | None) -> dict` e `GET /api/v1/observatorio/territorio?metrica=&cultura=&ano=`:

```
filtros: { valores: {metrica, cultura, ano}, opcoes: {metricas: [{slug, nome, unidade}], culturas: [Opcao], anos: [int]} }
metricas: { unidade, total, top5_pct, hhi, concentracao }
series: {
  municipios: [{codigo_ibge, nome, microrregiao, valor: float|null, status: "ok"|"sigiloso"|"sem_dado", categoria: str|null}],
  microrregioes: [{nome, valor}],
  dependentes: [{codigo_ibge, nome, cultura, participacao}],
  categorias: [Opcao]       // só para metrica=dominante: até 8 culturas + {"slug":"outras","nome":"Outras"}
}
```

Métricas: `valor` = valor-da-producao 5457 (deflacionado para `ano_ref`; cultura opcional); `area` = area-colhida 5457 (cultura opcional); `rebanho` = efetivo do `bovino` 3939 (cultura ignorada, `null` na resposta); `dominante` = cultura de maior valor por município. Todos os 52 municípios aparecem em `municipios`; quem não tem OK fica `valor: null` com `status` `sigiloso` (se houver linha sigilosa) ou `sem_dado`. Dependentes sempre calculados sobre o valor da 5457 do `ano`.

- [ ] **Step 1: Testes que falham**

```python
def test_territorio_valor(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "territorio")
    assert status == 200
    assert corpo["filtros"]["valores"] == {"metrica": "valor", "cultura": None, "ano": 2024}
    muns = {m["codigo_ibge"]: m for m in corpo["series"]["municipios"]}
    assert len(muns) == 4
    assert muns["1100031"]["status"] == "sigiloso" and muns["1100031"]["valor"] is None
    assert muns["1100023"]["valor"] == 3600.0
    assert {m["nome"]: m["valor"] for m in corpo["series"]["microrregioes"]} == {"Cacoal": 4800.0, "Vilhena": 900.0}
    assert corpo["metricas"]["top5_pct"] == 100.0
    assert corpo["qualidade"]["municipios_sigilosos"] == 1
    # Alta Floresta: só soja (100%); Cacoal: só café (100%); Ariquemes: soja 83%
    assert {d["codigo_ibge"] for d in corpo["series"]["dependentes"]} == {"1100015", "1100023", "1100049"}


def test_territorio_dominante_e_rebanho(api: APIClient, dados_observatorio: dict) -> None:
    _, dom = get(api, "territorio?metrica=dominante")
    cats = {m["codigo_ibge"]: m["categoria"] for m in dom["series"]["municipios"]}
    assert cats["1100023"] == "soja-em-grao" and cats["1100049"] == "cafe-em-grao-canephora"
    assert cats["1100031"] is None
    _, reb = get(api, "territorio?metrica=rebanho")
    assert reb["metricas"]["unidade"] == "Cabeças"
    assert reb["filtros"]["valores"]["cultura"] is None


def test_territorio_metrica_invalida(api: APIClient, dados_observatorio: dict) -> None:
    assert get(api, "territorio?metrica=chuva")[0] == 400
    assert get(api, "territorio?cultura=inexistente")[0] == 404
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_api.py -k territorio -v` → FAIL.

- [ ] **Step 3: Implementar**

`servico.py` (acrescentar; importar `from analise.regras import classificar_concentracao`):

```python
METRICAS_TERRITORIO = {
    "valor": ("Valor da produção", "Mil Reais"),
    "area": ("Área colhida", "Hectares"),
    "rebanho": ("Rebanho bovino", "Cabeças"),
    "dominante": ("Cultura dominante", ""),
}
MAX_CATEGORIAS = 8


def territorio(metrica: str, cultura: str | None, ano: int | None) -> dict[str, Any]:
    tabelas = [5457, 3939, 1737]
    culturas = leitura.produtos(5457)
    if cultura is not None and cultura not in culturas:
        raise NaoEncontrado(f"Cultura '{cultura}' não existe")
    if metrica in ("rebanho", "dominante"):
        cultura = None
    fonte = ("efetivo", 3939) if metrica == "rebanho" else ("area-colhida", 5457) if metrica == "area" else (VALOR, 5457)
    anos = leitura.anos_disponiveis(*fonte)
    opcoes = {
        "metricas": [{"slug": s, "nome": n, "unidade": u} for s, (n, u) in METRICAS_TERRITORIO.items()],
        "culturas": [{"slug": s, "nome": n} for s, n in culturas.items()],
        "anos": anos,
    }
    if not anos:
        return _vazio("territorio", {"valores": {"metrica": metrica, "cultura": cultura, "ano": ano}, "opcoes": opcoes}, tabelas)
    ano = anos[-1] if ano is None else ano
    _validar_ano(ano, anos)
    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(ano, indices)

    produto = "bovino" if metrica == "rebanho" else cultura
    valores = leitura.por_municipio(fonte[0], fonte[1], ano, produto)
    if metrica == "valor" and ano_ref is not None:
        valores = {k: v2 for k, v in valores.items() if (v2 := c.deflacionar(v, ano, ano_ref, indices)) is not None}
    por_produto = leitura.por_municipio_e_produto(VALOR, 5457, ano)
    dominantes = {m: c.cultura_dominante(v) for m, v in por_produto.items()}
    frequencia: dict[str, int] = {}
    for d in dominantes.values():
        if d:
            frequencia[d] = frequencia.get(d, 0) + 1
    principais = [s for s, _ in sorted(frequencia.items(), key=lambda kv: (-kv[1], kv[0]))[:MAX_CATEGORIAS]]

    lista_municipios = leitura.municipios()
    nomes_mun = {cod: nome for cod, nome, _ in lista_municipios}
    n_sigilosos = leitura.sigilosos(fonte[0], fonte[1], ano, produto)
    codigos_sigilosos = set(
        leitura.codigos_sigilosos(fonte[0], fonte[1], ano, produto)
    )
    municipios_saida = []
    for cod, nome, micro in lista_municipios:
        valor = valores.get(cod)
        status = "ok" if valor is not None else ("sigiloso" if cod in codigos_sigilosos else "sem_dado")
        dom = dominantes.get(cod)
        categoria = (dom if dom in principais else "outras") if (metrica == "dominante" and dom) else None
        municipios_saida.append({"codigo_ibge": cod, "nome": nome, "microrregiao": micro,
                                 "valor": f(valor), "status": status, "categoria": categoria})
    micro_de = {cod: micro for cod, _, micro in lista_municipios}
    microrregioes = sorted(
        ({"nome": n, "valor": f(v)} for n, v in c.somar_por_grupo(valores, micro_de).items()),
        key=lambda i: -(i["valor"] or 0),
    )
    dependentes = []
    for cod, vals in por_produto.items():
        dep = c.dependencia(vals)
        if dep:
            dependentes.append({"codigo_ibge": cod, "nome": nomes_mun.get(cod, cod),
                                "cultura": culturas.get(dep[0], dep[0]), "participacao": f(dep[1], 1)})
    dependentes.sort(key=lambda d: (-(d["participacao"] or 0), d["nome"]))

    total = sum(valores.values(), Decimal(0)) if valores else None
    ordenados = sorted(valores.items(), key=lambda kv: (-kv[1], kv[0]))
    top5 = sum((v for _, v in ordenados[:5]), Decimal(0)) if ordenados else None
    top5_pct = top5 / total * 100 if top5 is not None and total else None
    polo = nomes_mun.get(ordenados[0][0]) if ordenados else None
    categorias = []
    if metrica == "dominante":
        categorias = [{"slug": s, "nome": culturas[s]} for s in principais]
        if any(m["categoria"] == "outras" for m in municipios_saida):
            categorias.append({"slug": "outras", "nome": "Outras"})
    return {
        "filtros": {"valores": {"metrica": metrica, "cultura": cultura, "ano": ano}, "opcoes": opcoes},
        "metricas": {
            "unidade": METRICAS_TERRITORIO[metrica][1],
            "total": f(total),
            "top5_pct": f(top5_pct, 1),
            "hhi": f(c.hhi(valores), 0),
            "concentracao": classificar_concentracao(top5_pct) if top5_pct is not None else None,
        },
        "series": {"municipios": municipios_saida, "microrregioes": microrregioes,
                   "dependentes": dependentes, "categorias": categorias},
        "texto": {"manchete": r.manchete_territorio(metrica, ano, top5_pct, polo, len(dependentes)),
                  "como_ler": r.como_ler("territorio", ano_ref)},
        "qualidade": {"municipios_sigilosos": n_sigilosos, "ano_ref_monetario": ano_ref, "avisos": avisos},
        "meta": meta(tabelas),
    }
```

Acrescentar a `leitura.py` (e um teste em `test_observatorio_leitura.py`: `assert l.codigos_sigilosos("valor-da-producao", 5457, 2024) == ["1100031"]`):

```python
def codigos_sigilosos(indicador: str, tabela: int, ano: int, produto: str | None = None) -> list[str]:
    qs = Medicao.objects.filter(
        indicador__slug=indicador, produto__tabela_origem=tabela, ano=ano, status_valor=StatusValor.SIGILOSO
    )
    if produto:
        qs = qs.filter(produto__slug=produto)
    return sorted(set(qs.values_list("municipio_id", flat=True)))
```

e reescrever `sigilosos` como `return len(codigos_sigilosos(indicador, tabela, ano, produto))`. No `territorio`, usar só `codigos_sigilosos` e `n_sigilosos = len(codigos_sigilosos)`.

Nota sobre a manchete com `metrica="dominante"`: `valores` é o valor da produção (fonte padrão), então a frase de concentração continua correta.

`api/serializers.py` (acrescentar):

```python
class ConsultaTerritorioSerializer(serializers.Serializer):
    metrica = serializers.ChoiceField(choices=["valor", "area", "rebanho", "dominante"], required=False, default="valor")
    cultura = serializers.SlugField(required=False)
    ano = serializers.IntegerField(required=False)


class MetricaOpcaoSerializer(OpcaoSerializer):
    unidade = serializers.CharField(allow_blank=True)


class TerritorioValoresSerializer(serializers.Serializer):
    metrica = serializers.CharField()
    cultura = serializers.CharField(allow_null=True)
    ano = serializers.IntegerField(allow_null=True)


class TerritorioOpcoesSerializer(serializers.Serializer):
    metricas = MetricaOpcaoSerializer(many=True)
    culturas = OpcaoSerializer(many=True)
    anos = serializers.ListField(child=serializers.IntegerField())


class TerritorioFiltrosSerializer(serializers.Serializer):
    valores = TerritorioValoresSerializer()
    opcoes = TerritorioOpcoesSerializer()


class TerritorioMetricasSerializer(serializers.Serializer):
    unidade = serializers.CharField(required=False, allow_blank=True)
    total = serializers.FloatField(required=False, allow_null=True)
    top5_pct = serializers.FloatField(required=False, allow_null=True)
    hhi = serializers.FloatField(required=False, allow_null=True)
    concentracao = serializers.CharField(required=False, allow_null=True)


class MunicipioMapaSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    microrregiao = serializers.CharField(allow_blank=True)
    valor = serializers.FloatField(allow_null=True)
    status = serializers.ChoiceField(choices=["ok", "sigiloso", "sem_dado"])
    categoria = serializers.CharField(allow_null=True)


class GrupoValorSerializer(serializers.Serializer):
    nome = serializers.CharField()
    valor = serializers.FloatField(allow_null=True)


class DependenteSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    cultura = serializers.CharField()
    participacao = serializers.FloatField(allow_null=True)


class TerritorioSeriesSerializer(serializers.Serializer):
    municipios = MunicipioMapaSerializer(many=True, required=False)
    microrregioes = GrupoValorSerializer(many=True, required=False)
    dependentes = DependenteSerializer(many=True, required=False)
    categorias = OpcaoSerializer(many=True, required=False)


class TerritorioSerializer(serializers.Serializer):
    filtros = TerritorioFiltrosSerializer()
    metricas = TerritorioMetricasSerializer()
    series = TerritorioSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()
```

`api/views.py` — substituir `TerritorioView`:

```python
class TerritorioView(APIView):
    @extend_schema(parameters=[sz.ConsultaTerritorioSerializer], responses={200: sz.TerritorioSerializer, **ERROS})
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaTerritorioSerializer, request)
        return Response(sz.TerritorioSerializer(servico.territorio(d["metrica"], d.get("cultura"), d.get("ano"))).data)
```

- [ ] **Step 4: Rodar** — `$DEV pytest tests/test_observatorio_api.py tests/test_observatorio_leitura.py -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/observatorio apps/api/tests
git commit -m "feat(api): bloco Território com mapa, microrregiões, concentração e dependência"
```

---

### Task 11: Bloco Pecuária

**Files:**
- Modify: `apps/api/observatorio/servico.py`, `apps/api/observatorio/api/serializers.py`, `apps/api/observatorio/api/views.py`
- Test: `apps/api/tests/test_observatorio_api.py` (acrescentar)

**Interfaces:**
- Produces: `servico.pecuaria(rebanho: str | None, inicio: int | None, fim: int | None) -> dict` e `GET /api/v1/observatorio/pecuaria?rebanho=&inicio=&fim=`:

```
filtros: { valores: {rebanho, inicio, fim}, opcoes: {rebanhos: [Opcao], anos: [int]} }
metricas: { efetivo_final, variacao_pct, top5_pct,
            leite: {volume_mil_litros, valor_real, produtividade_l_vaca, variacao_produtividade_pct} | null }
series: { efetivo: [AnoValor], municipios: [MunicipioValor], composicao: [ItemValor],
          leite_polos: [{codigo_ibge, nome, volume, produtividade}] }
```

Regras: padrão `rebanho="bovino"`; `fim` padrão = último ano com efetivo (3939); `inicio = fim - 9`; rebanho inexistente na 3939 → 404. `composicao` = efetivo de todos os rebanhos da 3939 no `fim`, **exceto** `galinaceos-total` e `suino-matrizes-de-suinos` (subtotais que duplicariam contagem). Leite: produção (74, `producao-de-origem-animal`) ÷ vacas ordenhadas (94) no estado e por município; polos = 5 maiores volumes.

- [ ] **Step 1: Testes que falham**

```python
def test_pecuaria_padrao(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "pecuaria")
    assert status == 200
    assert corpo["filtros"]["valores"] == {"rebanho": "bovino", "inicio": 2015, "fim": 2024}
    m = corpo["metricas"]
    assert m["efetivo_final"] == 2000.0 and m["variacao_pct"] == 100.0
    # leite 2015: 1000 mil L / 1000 vacas = 1000 L; 2024: 2000/800 = 2500 L → +150%
    assert m["leite"]["produtividade_l_vaca"] == 2500.0
    assert m["leite"]["variacao_produtividade_pct"] == 150.0
    assert m["leite"]["valor_real"] == 300.0
    assert corpo["series"]["leite_polos"][0]["codigo_ibge"] == "1100015"
    assert corpo["texto"]["manchete"].startswith("O rebanho bovino cresceu 100,0%")


def test_pecuaria_rebanho_inexistente(api: APIClient, dados_observatorio: dict) -> None:
    assert get(api, "pecuaria?rebanho=dinossauro")[0] == 404
```

- [ ] **Step 2: Rodar e ver falhar** — `$DEV pytest tests/test_observatorio_api.py -k pecuaria -v` → FAIL.

- [ ] **Step 3: Implementar**

`servico.py` (acrescentar):

```python
SUBTOTAIS_REBANHO = {"galinaceos-total", "suino-matrizes-de-suinos"}


def _estadual_tabela(indicador: str, tabela: int, slug: str, inicio: int, fim: int) -> dict[int, Decimal]:
    return leitura.totais_por_produto(indicador, tabela, inicio, fim).get(slug, {})


def pecuaria(rebanho: str | None, inicio: int | None, fim: int | None) -> dict[str, Any]:
    tabelas = [3939, 74, 94, 1737]
    rebanhos = leitura.produtos(3939)
    rebanho = rebanho or "bovino"
    if rebanhos and rebanho not in rebanhos:
        raise NaoEncontrado(f"Rebanho '{rebanho}' não existe")
    anos = leitura.anos_disponiveis("efetivo", 3939)
    opcoes = {"rebanhos": [{"slug": s, "nome": n} for s, n in rebanhos.items()], "anos": anos}
    if not anos:
        return _vazio("pecuaria", {"valores": {"rebanho": rebanho, "inicio": inicio, "fim": fim}, "opcoes": opcoes}, tabelas)
    fim = fim if fim is not None else anos[-1]
    inicio = inicio if inicio is not None else fim - 9
    if inicio > fim:
        raise ConsultaInvalida("O ano inicial não pode ser maior que o ano final", {"inicio": "maior que fim"})

    efetivo = _estadual_tabela("efetivo", 3939, rebanho, inicio, fim)
    anos_janela = list(range(inicio, fim + 1))
    ini, fin = efetivo.get(inicio), efetivo.get(fim)
    variacao = (fin - ini) / ini * 100 if ini and fin is not None else None
    por_mun = leitura.por_municipio("efetivo", 3939, fim, rebanho)
    nomes_mun = {cod: nome for cod, nome, _ in leitura.municipios()}
    ordenados = sorted(por_mun.items(), key=lambda kv: (-kv[1], kv[0]))
    total = sum(por_mun.values(), Decimal(0))
    top5_pct = sum((v for _, v in ordenados[:5]), Decimal(0)) / total * 100 if total else None
    composicao_bruta = {
        s: v.get(fim) for s, v in leitura.totais_por_produto("efetivo", 3939, fim, fim).items()
        if s not in SUBTOTAIS_REBANHO and v.get(fim) is not None
    }
    partes = c.participacoes(composicao_bruta)
    composicao = sorted(
        ({"slug": s, "nome": rebanhos[s], "valor": f(v, 0), "participacao": f(partes.get(s), 1)}
         for s, v in composicao_bruta.items()),
        key=lambda i: -(i["valor"] or 0),
    )

    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(fim, indices)
    volume = _estadual_tabela("producao-de-origem-animal", 74, "leite", inicio, fim)
    vacas = _estadual_tabela("vacas-ordenhadas", 94, "vacas-ordenhadas", inicio, fim)
    valor_leite = _estadual_tabela(VALOR, 74, "leite", fim, fim).get(fim)
    prod_ini = c.produtividade_leite(volume.get(inicio), vacas.get(inicio))
    prod_fim = c.produtividade_leite(volume.get(fim), vacas.get(fim))
    var_prod = (prod_fim - prod_ini) / prod_ini * 100 if prod_ini and prod_fim is not None else None
    leite = None
    if volume.get(fim) is not None:
        leite = {
            "volume_mil_litros": f(volume.get(fim), 0),
            "valor_real": f(c.deflacionar(valor_leite, fim, ano_ref, indices)) if ano_ref else None,
            "produtividade_l_vaca": f(prod_fim, 0),
            "variacao_produtividade_pct": f(var_prod, 1),
        }
    vol_mun = leitura.por_municipio("producao-de-origem-animal", 74, fim, "leite")
    vacas_mun = leitura.por_municipio("vacas-ordenhadas", 94, fim, "vacas-ordenhadas")
    polos = [
        {"codigo_ibge": cod, "nome": nomes_mun.get(cod, cod), "volume": f(v, 0),
         "produtividade": f(c.produtividade_leite(v, vacas_mun.get(cod)), 0)}
        for cod, v in sorted(vol_mun.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    ]
    return {
        "filtros": {"valores": {"rebanho": rebanho, "inicio": inicio, "fim": fim}, "opcoes": opcoes},
        "metricas": {"efetivo_final": f(fin, 0), "variacao_pct": f(variacao, 1),
                     "top5_pct": f(top5_pct, 1), "leite": leite},
        "series": {
            "efetivo": [{"ano": a, "valor": f(efetivo.get(a), 0)} for a in anos_janela],
            "municipios": [{"codigo_ibge": cod, "nome": nomes_mun.get(cod, cod), "valor": f(v, 0)} for cod, v in ordenados],
            "composicao": composicao,
            "leite_polos": polos,
        },
        "texto": {
            "manchete": r.manchete_pecuaria(rebanhos.get(rebanho, rebanho), inicio, fim, variacao,
                                            nomes_mun.get(ordenados[0][0]) if ordenados else None, var_prod),
            "como_ler": r.como_ler("pecuaria", ano_ref),
        },
        "qualidade": {"municipios_sigilosos": leitura.sigilosos("efetivo", 3939, fim, rebanho),
                      "ano_ref_monetario": ano_ref, "avisos": avisos},
        "meta": meta(tabelas),
    }
```

`api/serializers.py` (acrescentar):

```python
class ConsultaPecuariaSerializer(serializers.Serializer):
    rebanho = serializers.SlugField(required=False)
    inicio = serializers.IntegerField(required=False, min_value=1974)
    fim = serializers.IntegerField(required=False, min_value=1974)


class PecuariaValoresSerializer(serializers.Serializer):
    rebanho = serializers.CharField()
    inicio = serializers.IntegerField(allow_null=True)
    fim = serializers.IntegerField(allow_null=True)


class PecuariaOpcoesSerializer(serializers.Serializer):
    rebanhos = OpcaoSerializer(many=True)
    anos = serializers.ListField(child=serializers.IntegerField())


class PecuariaFiltrosSerializer(serializers.Serializer):
    valores = PecuariaValoresSerializer()
    opcoes = PecuariaOpcoesSerializer()


class LeiteSerializer(serializers.Serializer):
    volume_mil_litros = serializers.FloatField(allow_null=True)
    valor_real = serializers.FloatField(allow_null=True)
    produtividade_l_vaca = serializers.FloatField(allow_null=True)
    variacao_produtividade_pct = serializers.FloatField(allow_null=True)


class PecuariaMetricasSerializer(serializers.Serializer):
    efetivo_final = serializers.FloatField(required=False, allow_null=True)
    variacao_pct = serializers.FloatField(required=False, allow_null=True)
    top5_pct = serializers.FloatField(required=False, allow_null=True)
    leite = LeiteSerializer(required=False, allow_null=True)


class PoloLeiteSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    volume = serializers.FloatField(allow_null=True)
    produtividade = serializers.FloatField(allow_null=True)


class PecuariaSeriesSerializer(serializers.Serializer):
    efetivo = AnoValorSerializer(many=True, required=False)
    municipios = MunicipioValorSerializer(many=True, required=False)
    composicao = ItemValorSerializer(many=True, required=False)
    leite_polos = PoloLeiteSerializer(many=True, required=False)


class PecuariaSerializer(serializers.Serializer):
    filtros = PecuariaFiltrosSerializer()
    metricas = PecuariaMetricasSerializer()
    series = PecuariaSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()
```

`api/views.py` — substituir `PecuariaView`:

```python
class PecuariaView(APIView):
    @extend_schema(parameters=[sz.ConsultaPecuariaSerializer], responses={200: sz.PecuariaSerializer, **ERROS})
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaPecuariaSerializer, request)
        return Response(sz.PecuariaSerializer(servico.pecuaria(d.get("rebanho"), d.get("inicio"), d.get("fim"))).data)
```

- [ ] **Step 4: Rodar a suíte inteira e lint/tipos**

Run: `$DEV pytest -q && $DEV ruff check . && $DEV mypy .`
Expected: tudo PASS.

- [ ] **Step 5: Medir desempenho no banco completo**

```bash
docker compose up -d --build api
for b in panorama crescimento territorio pecuaria; do for i in 1 2 3 4 5; do curl -s -o /dev/null -w "$b %{time_total}\n" "http://localhost:3000/api/v1/observatorio/$b"; done; done
```

Expected: todas ≤ 0,5 s. Se alguma passar, adicionar em `observatorio/servico.py` um cache por processo `functools.lru_cache(maxsize=256)` numa função `_cache(bloco, parametros_tuple, carga_id)` chaveada pelo `max(Carga.id)` concluído, envolvendo a função do bloco, e repetir a medição.

- [ ] **Step 6: Commit**

```bash
git add apps/api/observatorio apps/api/tests/test_observatorio_api.py
git commit -m "feat(api): bloco Pecuária com rebanhos e produtividade do leite"
```

---

### Task 12: Front — tipos, cliente e filtros na URL

**Files:**
- Modify: `apps/web/src/lib/api-types.ts`, `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/observatorio-url.ts`, `apps/web/src/components/observatorio/consultas.ts`
- Test: `apps/web/src/lib/observatorio-url.test.ts`

**Interfaces:**
- Produces:
  - Tipos `BlocoObservatorio = "panorama" | "crescimento" | "territorio" | "pecuaria"`, `RespostaBase<F, M, S>`, `PanoramaResposta`, `CrescimentoResposta`, `TerritorioResposta`, `PecuariaResposta` (espelham os serializers das Tasks 8–11).
  - `api.observatorio(bloco: BlocoObservatorio, query: string): Promise<…>`
  - `PREFIXOS: Record<BlocoObservatorio, string>` = `{panorama: "pan_", crescimento: "cre_", territorio: "ter_", pecuaria: "pec_"}`
  - `parametrosDoBloco(sp: URLSearchParams, bloco): URLSearchParams` (só as chaves do bloco, sem prefixo)
  - `comFiltro(sp: URLSearchParams, bloco, chave: string, valor: string | null): URLSearchParams` (nova instância; `null`/`""` remove)
  - `semFiltrosDoBloco(sp, bloco): URLSearchParams`
  - `usePanorama(qs)`, `useCrescimento(qs)`, `useTerritorio(qs)`, `usePecuaria(qs)` (TanStack Query, `queryKey: ["observatorio", bloco, qs]`)

- [ ] **Step 1: Teste que falha**

`apps/web/src/lib/observatorio-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { comFiltro, parametrosDoBloco, semFiltrosDoBloco } from "./observatorio-url";

describe("filtros do Observatório na URL", () => {
  const sp = new URLSearchParams("pan_ano=2024&pan_janela=5&cre_cultura=soja-em-grao&utm=x");

  it("lê só os parâmetros do bloco, sem o prefixo", () => {
    expect(parametrosDoBloco(sp, "panorama").toString()).toBe("ano=2024&janela=5");
    expect(parametrosDoBloco(sp, "crescimento").toString()).toBe("cultura=soja-em-grao");
    expect(parametrosDoBloco(sp, "territorio").toString()).toBe("");
  });

  it("grava e remove um filtro sem mexer nos outros blocos", () => {
    const novo = comFiltro(sp, "crescimento", "inicio", "2015");
    expect(novo.get("cre_inicio")).toBe("2015");
    expect(novo.get("pan_ano")).toBe("2024");
    expect(comFiltro(novo, "crescimento", "inicio", null).has("cre_inicio")).toBe(false);
    expect(sp.has("cre_inicio")).toBe(false); // não muta a entrada
  });

  it("volta ao padrão de um bloco só", () => {
    const limpo = semFiltrosDoBloco(sp, "panorama");
    expect(limpo.toString()).toBe("cre_cultura=soja-em-grao&utm=x");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `cd apps/web && npx vitest run src/lib/observatorio-url.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

`src/lib/observatorio-url.ts`:

```ts
import type { BlocoObservatorio } from "./api-types";

export const PREFIXOS: Record<BlocoObservatorio, string> = {
  panorama: "pan_",
  crescimento: "cre_",
  territorio: "ter_",
  pecuaria: "pec_",
};

export function parametrosDoBloco(sp: URLSearchParams, bloco: BlocoObservatorio): URLSearchParams {
  const prefixo = PREFIXOS[bloco];
  const saida = new URLSearchParams();
  for (const [k, v] of sp) if (k.startsWith(prefixo) && v) saida.set(k.slice(prefixo.length), v);
  return saida;
}

export function comFiltro(sp: URLSearchParams, bloco: BlocoObservatorio, chave: string, valor: string | null): URLSearchParams {
  const novo = new URLSearchParams(sp);
  const k = PREFIXOS[bloco] + chave;
  if (valor) novo.set(k, valor);
  else novo.delete(k);
  return novo;
}

export function semFiltrosDoBloco(sp: URLSearchParams, bloco: BlocoObservatorio): URLSearchParams {
  const novo = new URLSearchParams();
  for (const [k, v] of sp) if (!k.startsWith(PREFIXOS[bloco])) novo.append(k, v);
  return novo;
}
```

`src/lib/api-types.ts` (acrescentar ao fim):

```ts
export type BlocoObservatorio = "panorama" | "crescimento" | "territorio" | "pecuaria";

export interface Opcao {
  slug: string;
  nome: string;
}

export interface ItemValor extends Opcao {
  valor: number | null;
  participacao: number | null;
}

export interface AnoValor {
  ano: number;
  valor: number | null;
}

export interface TextoObservatorio {
  manchete: string;
  como_ler: string[];
}

export interface QualidadeObservatorio {
  municipios_sigilosos: number;
  ano_ref_monetario: number | null;
  avisos: string[];
}

export interface MetaObservatorio {
  fontes: { fonte: string; tabela_sidra: number; url_fonte: string }[];
  atualizado_em: string | null;
}

export interface RespostaBase<V, O, M, S> {
  filtros: { valores: V; opcoes: O };
  metricas: Partial<M>;
  series: Partial<S>;
  texto: TextoObservatorio;
  qualidade: QualidadeObservatorio;
  meta: MetaObservatorio;
}

export type PanoramaResposta = RespostaBase<
  { ano: number | null; janela: number; inicio: number | null },
  { anos: number[]; janelas: number[] },
  { valor_total_real: number | null; valor_lavouras_real: number | null; valor_origem_animal_real: number | null; variacao_real_pct: number | null; area_colhida_ha: number | null },
  { composicao: ItemValor[]; evolucao: { anos: number[]; itens: { slug: string; nome: string; valores: (number | null)[] }[] } }
>;

export type CrescimentoResposta = RespostaBase<
  { cultura: string | null; inicio: number | null; fim: number | null },
  { culturas: Opcao[]; anos: number[] },
  { variacao_producao_pct: number | null; parte_area_pct: number | null; parte_rendimento_pct: number | null; perda_media_pct: number | null; perda_ultimo_ano_pct: number | null },
  { indices: { anos: number[]; area: (number | null)[]; rendimento: (number | null)[]; producao: (number | null)[] }; perda: AnoValor[]; valor_por_hectare: ItemValor[] }
>;

export type MetricaTerritorio = "valor" | "area" | "rebanho" | "dominante";

export interface MunicipioMapa {
  codigo_ibge: string;
  nome: string;
  microrregiao: string;
  valor: number | null;
  status: "ok" | "sigiloso" | "sem_dado";
  categoria: string | null;
}

export type TerritorioResposta = RespostaBase<
  { metrica: MetricaTerritorio; cultura: string | null; ano: number | null },
  { metricas: (Opcao & { unidade: string })[]; culturas: Opcao[]; anos: number[] },
  { unidade: string; total: number | null; top5_pct: number | null; hhi: number | null; concentracao: string | null },
  { municipios: MunicipioMapa[]; microrregioes: { nome: string; valor: number | null }[]; dependentes: { codigo_ibge: string; nome: string; cultura: string; participacao: number | null }[]; categorias: Opcao[] }
>;

export type PecuariaResposta = RespostaBase<
  { rebanho: string; inicio: number | null; fim: number | null },
  { rebanhos: Opcao[]; anos: number[] },
  { efetivo_final: number | null; variacao_pct: number | null; top5_pct: number | null; leite: { volume_mil_litros: number | null; valor_real: number | null; produtividade_l_vaca: number | null; variacao_produtividade_pct: number | null } | null },
  { efetivo: AnoValor[]; municipios: { codigo_ibge: string; nome: string; valor: number | null }[]; composicao: ItemValor[]; leite_polos: { codigo_ibge: string; nome: string; volume: number | null; produtividade: number | null }[] }
>;

export interface RespostasObservatorio {
  panorama: PanoramaResposta;
  crescimento: CrescimentoResposta;
  territorio: TerritorioResposta;
  pecuaria: PecuariaResposta;
}
```

`src/lib/api.ts` — importar `BlocoObservatorio, RespostasObservatorio` e acrescentar ao objeto `api`:

```ts
  observatorio: <B extends BlocoObservatorio>(bloco: B, query: string) =>
    request<RespostasObservatorio[B]>(`${API_BASE}/observatorio/${bloco}${query ? `?${query}` : ""}`),
```

`src/components/observatorio/consultas.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BlocoObservatorio } from "@/lib/api-types";

export function useBlocoObservatorio<B extends BlocoObservatorio>(bloco: B, qs: string) {
  return useQuery({ queryKey: ["observatorio", bloco, qs], queryFn: () => api.observatorio(bloco, qs) });
}
```

- [ ] **Step 4: Rodar** — `cd apps/web && npx vitest run src/lib/observatorio-url.test.ts && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib apps/web/src/components/observatorio/consultas.ts
git commit -m "feat(web): tipos, cliente e filtros na URL do Observatório"
```

---

### Task 13: Front — molde do bloco, tabela de dados e seletor

**Files:**
- Create: `apps/web/src/components/observatorio/bloco.tsx`, `apps/web/src/components/observatorio/tabela-dados.tsx`, `apps/web/src/components/observatorio/seletor.tsx`
- Test: `apps/web/src/components/observatorio/bloco.test.tsx`

**Interfaces:**
- Consumes: `ErroConsulta`, `Carregando` de `@/components/painel/comuns`; `ApiError` de `@/lib/api`; `formatDataHora` de `@/lib/format`; tipos da Task 12.
- Produces:
  - `<Bloco id titulo etiqueta consulta={UseQueryResult<RespostaBase<…>>} filtros={ReactNode} tabela={(d) => ReactNode} linkPainel?={(d) => string | null} onPadrao={() => void}>{(d) => ReactNode}</Bloco>` — renderiza: etiqueta + `h2`, filtros, manchete (`<p data-testid="manchete">`), área do gráfico com botão "Ver como tabela"/"Ver como gráfico" (`aria-pressed`), lista "Como ler", avisos de qualidade, fontes com data e o link "Ver no Painel". Erro 400 mostra a mensagem e o botão "Voltar ao padrão" (`onPadrao`); outros erros usam `ErroConsulta` com "tentar de novo".
  - `<TabelaDados legenda colunas={{chave, rotulo, numerico?}[]} linhas={Record<string, string | number | null>[]} />` (célula `null` exibe "–"; células numéricas formatadas com `formatNumero`).
  - `<Seletor rotulo valor opcoes={{valor, rotulo}[]} onChange />` (`<label>` + `<select>`).

- [ ] **Step 1: Teste que falha**

`apps/web/src/components/observatorio/bloco.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { PanoramaResposta } from "@/lib/api-types";
import { Bloco } from "./bloco";

const dados = {
  filtros: { valores: { ano: 2024, janela: 10, inicio: 2015 }, opcoes: { anos: [2024], janelas: [5, 10, 20] } },
  metricas: {},
  series: {},
  texto: { manchete: "Em 2024, Soja respondeu por 70,0%.", como_ler: ["Primeira explicação.", "Segunda."] },
  qualidade: { municipios_sigilosos: 2, ano_ref_monetario: 2024, avisos: ["Sem carne bovina."] },
  meta: { fontes: [{ fonte: "IBGE – PAM", tabela_sidra: 5457, url_fonte: "https://sidra.ibge.gov.br/Tabela/5457" }], atualizado_em: "2026-10-01T12:00:00Z" },
} satisfies PanoramaResposta;

const consulta = (parcial: Partial<UseQueryResult<PanoramaResposta>>) =>
  ({ isPending: false, isError: false, data: dados, error: null, refetch: vi.fn(), ...parcial }) as unknown as UseQueryResult<PanoramaResposta>;

describe("Bloco do Observatório", () => {
  it("mostra manchete, como ler, avisos, fonte e alterna gráfico e tabela", async () => {
    render(
      <Bloco id="panorama" etiqueta="01" titulo="Panorama" consulta={consulta({})} filtros={null} onPadrao={vi.fn()}
        tabela={() => <table aria-label="dados"><tbody><tr><td>x</td></tr></tbody></table>}
        linkPainel={() => "/painel?segmento=agricultura"}>
        {() => <div data-testid="grafico-falso" />}
      </Bloco>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Panorama" })).toBeInTheDocument();
    expect(screen.getByTestId("manchete")).toHaveTextContent("Soja respondeu por 70,0%");
    expect(screen.getByText("Primeira explicação.")).toBeInTheDocument();
    expect(screen.getByText("Sem carne bovina.")).toBeInTheDocument();
    expect(screen.getByText(/2 municípios com dado sigiloso/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /IBGE – PAM/ })).toHaveAttribute("href", "https://sidra.ibge.gov.br/Tabela/5457");
    expect(screen.getByRole("link", { name: /Ver no Painel/ })).toHaveAttribute("href", "/painel?segmento=agricultura");
    expect(screen.getByTestId("grafico-falso")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    expect(screen.getByRole("table", { name: "dados" })).toBeInTheDocument();
    expect(screen.queryByTestId("grafico-falso")).not.toBeInTheDocument();
  });

  it("erro 400 oferece voltar ao padrão", async () => {
    const onPadrao = vi.fn();
    render(
      <Bloco id="panorama" etiqueta="01" titulo="Panorama" onPadrao={onPadrao} filtros={null} tabela={() => null}
        consulta={consulta({ isError: true, data: undefined, error: new ApiError(400, "Parâmetros inválidos") })}>
        {() => null}
      </Bloco>,
    );
    expect(screen.getByText("Parâmetros inválidos")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão" }));
    expect(onPadrao).toHaveBeenCalled();
  });

  it("carregando mostra o estado de espera", () => {
    render(
      <Bloco id="panorama" etiqueta="01" titulo="Panorama" onPadrao={vi.fn()} filtros={null} tabela={() => null}
        consulta={consulta({ isPending: true, data: undefined })}>
        {() => null}
      </Bloco>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/components/observatorio/bloco.test.tsx` → FAIL.

- [ ] **Step 3: Implementar**

`tabela-dados.tsx`:

```tsx
import { formatNumero } from "@/lib/format";

export interface ColunaTabela {
  chave: string;
  rotulo: string;
  numerico?: boolean;
}

export function TabelaDados({ legenda, colunas, linhas }: { legenda: string; colunas: ColunaTabela[]; linhas: Record<string, string | number | null>[] }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-md border border-line">
      <table className="w-full text-sm" aria-label={legenda}>
        <caption className="sr-only">{legenda}</caption>
        <thead className="sticky top-0 bg-surface-alt">
          <tr>
            {colunas.map((c) => (
              <th key={c.chave} scope="col" className={c.numerico ? "px-3 py-2 text-right" : "px-3 py-2 text-left"}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-t border-line">
              {colunas.map((c) => {
                const v = l[c.chave];
                const texto = v === null || v === undefined ? "–" : typeof v === "number" ? formatNumero(v) : v;
                return (
                  <td key={c.chave} className={c.numerico ? "px-3 py-1.5 text-right tabular-nums" : "px-3 py-1.5"}>
                    {texto}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`seletor.tsx`:

```tsx
import { useId } from "react";

export function Seletor({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: string; opcoes: { valor: string; rotulo: string }[]; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {rotulo}
      </label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-line bg-card px-3 text-sm focus-visible:outline-brand">
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
    </div>
  );
}
```

`bloco.tsx`:

```tsx
"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Carregando, ErroConsulta } from "@/components/painel/comuns";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import type { RespostaBase } from "@/lib/api-types";
import { formatDataHora } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resposta = RespostaBase<any, any, any, any>;

interface BlocoProps<R extends Resposta> {
  id: string;
  etiqueta: string;
  titulo: string;
  consulta: UseQueryResult<R>;
  filtros: ReactNode;
  tabela: (d: R) => ReactNode;
  linkPainel?: (d: R) => string | null;
  onPadrao: () => void;
  children: (d: R) => ReactNode;
}

export function Bloco<R extends Resposta>({ id, etiqueta, titulo, consulta, filtros, tabela, linkPainel, onPadrao, children }: BlocoProps<R>) {
  const [comoTabela, setComoTabela] = useState(false);
  const d = consulta.data;
  const painel = d && linkPainel ? linkPainel(d) : null;
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-32 border-t border-line pt-12">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-fg">{etiqueta}</p>
      <h2 id={`${id}-titulo`} className="mt-1 text-[1.75rem] font-semibold tracking-tight">{titulo}</h2>
      {filtros && <div className="mt-5 flex flex-wrap gap-4">{filtros}</div>}

      {consulta.isPending && <Carregando rotulo={`Carregando ${titulo.toLowerCase()}…`} />}
      {consulta.isError && consulta.error instanceof ApiError && consulta.error.status === 400 ? (
        <div role="alert" className="mt-6 rounded-md border border-line bg-surface-alt p-5">
          <p className="font-medium">{consulta.error.message}</p>
          <Button className="mt-3" onClick={onPadrao}>Voltar ao padrão</Button>
        </div>
      ) : consulta.isError ? (
        <ErroConsulta erro={consulta.error} onRetry={() => void consulta.refetch()} />
      ) : null}

      {d && (
        <>
          <p data-testid="manchete" className="mt-6 max-w-[70ch] text-lg font-medium leading-relaxed">{d.texto.manchete}</p>
          <div className="mt-6">
            <div className="mb-2 flex justify-end">
              <Button variant="outline" size="sm" aria-pressed={comoTabela} onClick={() => setComoTabela((v) => !v)}>
                {comoTabela ? "Ver como gráfico" : "Ver como tabela"}
              </Button>
            </div>
            {comoTabela ? tabela(d) : children(d)}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-[3fr_2fr]">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">Como ler</h3>
              <ul className="mt-2 space-y-2 leading-relaxed text-ink-muted">
                {d.texto.como_ler.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <aside aria-label="Fonte e qualidade do dado" className="rounded-md bg-surface-alt p-4 text-sm">
              <ul className="space-y-1.5 text-ink-muted">
                {d.qualidade.avisos.map((a) => <li key={a}>{a}</li>)}
                {d.qualidade.municipios_sigilosos > 0 && (
                  <li>{d.qualidade.municipios_sigilosos} municípios com dado sigiloso ficam fora dos totais.</li>
                )}
              </ul>
              <p className="mt-3">
                Fonte:{" "}
                {d.meta.fontes.map((fte, i) => (
                  <span key={fte.tabela_sidra}>
                    {i > 0 && "; "}
                    <a href={fte.url_fonte} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-fg underline">
                      {fte.fonte} (tabela {fte.tabela_sidra})
                    </a>
                  </span>
                ))}
                {d.meta.atualizado_em && <>. Atualizado em {formatDataHora(d.meta.atualizado_em)}.</>}
              </p>
              {painel && (
                <Link href={painel} className="mt-3 inline-flex items-center gap-1 font-medium text-brand-fg hover:underline">
                  Ver no Painel <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
```

(Confirme no `Carregando` de `components/painel/comuns.tsx` que ele usa `role="status"`; se não usar, envolva-o em `<div role="status">`.)

- [ ] **Step 4: Rodar** — `npx vitest run src/components/observatorio && npm run lint && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/observatorio
git commit -m "feat(web): molde de bloco do Observatório com tabela acessível e estados"
```

---

### Task 14: Front — gráficos (options puros), mapa e componente de gráfico

**Files:**
- Create: `apps/web/src/lib/observatorio-graficos.ts`, `apps/web/src/components/observatorio/grafico-observatorio.tsx`, `apps/web/src/components/observatorio/mapa-municipios.tsx`
- Test: `apps/web/src/lib/observatorio-graficos.test.ts`, `apps/web/src/components/observatorio/mapa-municipios.test.tsx`

**Interfaces:**
- Consumes: `Grafico` de `@/components/painel/grafico` (aceita qualquer `option`), `PALETA` de `@/lib/chart-options`, tipos da Task 12.
- Produces:
  - `optionTreemap(itens: ItemValor[], unidade: string)`, `optionAreaEmpilhada(evolucao, unidade)`, `optionIndices(indices)`, `optionDecomposicao(parteArea: number, parteRendimento: number)`, `optionBarrasHorizontais(itens: {nome, valor}[], unidade)`, `optionLinha(pontos: AnoValor[], nome, unidade)`, `optionMapa(municipios: MunicipioMapa[], unidade, categorias: Opcao[])` — todas devolvem `EChartsCoreOption`.
  - `COR_SEM_DADO = "#c9d3ce"`; `CORES_CATEGORIA` (9 cores, a 9ª para "outras").
  - `<GraficoObservatorio option descricao altura? />` registra `TreemapChart`, `MapChart`, `VisualMapComponent` e repassa ao `Grafico`.
  - `<MapaMunicipios municipios unidade categorias descricao />` carrega `/geo/ro-municipios.json` uma vez (cache de módulo), chama `echarts.registerMap("rondonia", geo)` e renderiza; se o GeoJSON falhar, mostra o aviso "Não foi possível carregar o mapa; veja os dados como tabela." (o botão de tabela do bloco continua funcionando).

- [ ] **Step 1: Testes que falham**

`src/lib/observatorio-graficos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MunicipioMapa } from "./api-types";
import { COR_SEM_DADO, optionDecomposicao, optionMapa, optionTreemap } from "./observatorio-graficos";

const m = (codigo: string, valor: number | null, status: MunicipioMapa["status"], categoria: string | null = null): MunicipioMapa =>
  ({ codigo_ibge: codigo, nome: codigo, microrregiao: "", valor, status, categoria });

describe("options do Observatório", () => {
  it("treemap usa as participações e ignora valores nulos", () => {
    const o = optionTreemap([
      { slug: "soja", nome: "Soja", valor: 70, participacao: 70 },
      { slug: "x", nome: "X", valor: null, participacao: null },
    ], "Mil Reais") as { series: { data: { name: string; value: number }[] }[] };
    expect(o.series[0]!.data).toEqual([{ name: "Soja", value: 70 }]);
  });

  it("mapa contínuo pinta sigiloso e sem dado de cinza, nunca como zero", () => {
    const o = optionMapa([m("1", 10, "ok"), m("2", null, "sigiloso"), m("3", null, "sem_dado")], "Mil Reais", []) as {
      series: { data: { name: string; value: number | null; itemStyle?: { areaColor: string } }[] }[];
    };
    const dados = o.series[0]!.data;
    expect(dados.find((d) => d.name === "1")!.value).toBe(10);
    expect(dados.find((d) => d.name === "2")!.value).toBeNull();
    expect(dados.find((d) => d.name === "2")!.itemStyle!.areaColor).toBe(COR_SEM_DADO);
  });

  it("mapa por categoria colore pela cultura e tem legenda com rótulos", () => {
    const o = optionMapa([m("1", 1, "ok", "soja"), m("2", 1, "ok", "outras")], "", [{ slug: "soja", nome: "Soja" }, { slug: "outras", nome: "Outras" }]) as {
      visualMap: { type: string; categories: string[] };
    };
    expect(o.visualMap.type).toBe("piecewise");
    expect(o.visualMap.categories).toEqual(["Soja", "Outras"]);
  });

  it("decomposição tem duas barras que somam 100", () => {
    const o = optionDecomposicao(30, 70) as { series: { data: number[] }[] };
    expect(o.series.map((s) => s.data[0])).toEqual([30, 70]);
  });
});
```

`src/components/observatorio/mapa-municipios.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapaMunicipios } from "./mapa-municipios";

afterEach(() => vi.unstubAllGlobals());

describe("MapaMunicipios", () => {
  it("avisa quando o GeoJSON não carrega", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<MapaMunicipios municipios={[]} unidade="Mil Reais" categorias={[]} descricao="Mapa" />);
    expect(await screen.findByText(/Não foi possível carregar o mapa/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/lib/observatorio-graficos.test.ts src/components/observatorio/mapa-municipios.test.tsx` → FAIL.

- [ ] **Step 3: Implementar**

`src/lib/observatorio-graficos.ts`:

```ts
import type { EChartsCoreOption } from "echarts/core";
import type { AnoValor, ItemValor, MunicipioMapa, Opcao } from "./api-types";
import { PALETA } from "./chart-options";
import { formatCompacto, formatNumero } from "./format";

export const COR_SEM_DADO = "#c9d3ce";
export const CORES_CATEGORIA = [...PALETA, "#a3324b", "#0f7c8c", "#8a6d1f", "#7a8a84"];
const ESCALA = ["#e6f2ec", "#9fd0b5", "#3f9a73", "#00604e", "#003329"];
const texto = { fontFamily: "Poppins, system-ui, sans-serif" };

export function optionTreemap(itens: ItemValor[], unidade: string): EChartsCoreOption {
  return {
    color: CORES_CATEGORIA,
    textStyle: texto,
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: <strong>${formatNumero(p.value)}</strong> ${unidade.toLowerCase()}` },
    series: [{
      type: "treemap", roam: false, nodeClick: false, breadcrumb: { show: false },
      label: { formatter: "{b}" },
      data: itens.filter((i) => i.valor !== null).map((i) => ({ name: i.nome, value: i.valor as number })),
    }],
  };
}

export function optionAreaEmpilhada(evolucao: { anos: number[]; itens: { nome: string; valores: (number | null)[] }[] }, unidade: string): EChartsCoreOption {
  return {
    color: CORES_CATEGORIA, textStyle: texto,
    tooltip: { trigger: "axis" }, legend: { type: "scroll", top: 0 },
    grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: evolucao.anos.map(String), boundaryGap: false },
    yAxis: { type: "value", name: unidade, axisLabel: { formatter: (v: number) => formatCompacto(v) } },
    series: evolucao.itens.map((i) => ({ type: "line", name: i.nome, stack: "total", areaStyle: {}, symbol: "none", data: i.valores })),
  };
}

export function optionIndices(indices: { anos: number[]; area: (number | null)[]; rendimento: (number | null)[]; producao: (number | null)[] }): EChartsCoreOption {
  return {
    color: PALETA, textStyle: texto, tooltip: { trigger: "axis" }, legend: { top: 0 },
    grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: indices.anos.map(String) },
    yAxis: { type: "value", name: "Índice (início = 100)" },
    series: [
      { type: "line", name: "Produção", data: indices.producao },
      { type: "line", name: "Área colhida", data: indices.area },
      { type: "line", name: "Rendimento", data: indices.rendimento },
    ],
  };
}

export function optionDecomposicao(parteArea: number, parteRendimento: number): EChartsCoreOption {
  return {
    color: [PALETA[2], PALETA[0]], textStyle: texto, legend: { top: 0 },
    tooltip: { formatter: (p: { seriesName: string; value: number }) => `${p.seriesName}: <strong>${formatNumero(p.value)}%</strong>` },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
    yAxis: { type: "category", data: ["Contribuição"] },
    series: [
      { type: "bar", name: "Expansão de área", stack: "c", data: [parteArea], label: { show: true, formatter: "{c}%" } },
      { type: "bar", name: "Ganho de produtividade", stack: "c", data: [parteRendimento], label: { show: true, formatter: "{c}%" } },
    ],
  };
}

export function optionBarrasHorizontais(itens: { nome: string; valor: number | null }[], unidade: string): EChartsCoreOption {
  const ordenados = [...itens].filter((i) => i.valor !== null).reverse();
  return {
    color: PALETA, textStyle: texto, tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", name: unidade, axisLabel: { formatter: (v: number) => formatCompacto(v) } },
    yAxis: { type: "category", data: ordenados.map((i) => i.nome) },
    series: [{ type: "bar", data: ordenados.map((i) => i.valor) }],
  };
}

export function optionLinha(pontos: AnoValor[], nome: string, unidade: string): EChartsCoreOption {
  return {
    color: PALETA, textStyle: texto, tooltip: { trigger: "axis" },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: pontos.map((p) => String(p.ano)) },
    yAxis: { type: "value", name: unidade, axisLabel: { formatter: (v: number) => formatCompacto(v) } },
    series: [{ type: "line", name: nome, data: pontos.map((p) => p.valor), areaStyle: { opacity: 0.15 } }],
  };
}

export function optionMapa(municipios: MunicipioMapa[], unidade: string, categorias: Opcao[]): EChartsCoreOption {
  const porCategoria = categorias.length > 0;
  const nomeCat = new Map(categorias.map((c) => [c.slug, c.nome]));
  const valores = municipios.map((m) => m.valor).filter((v): v is number => v !== null);
  const dados = municipios.map((m) => {
    const semDado = porCategoria ? m.categoria === null : m.valor === null;
    return {
      name: m.codigo_ibge,
      value: porCategoria ? (m.categoria ? nomeCat.get(m.categoria) ?? null : null) : m.valor,
      nome: m.nome,
      status: m.status,
      ...(semDado ? { itemStyle: { areaColor: COR_SEM_DADO } } : {}),
    };
  });
  return {
    textStyle: texto,
    tooltip: {
      formatter: (p: { data?: { nome: string; value: number | string | null; status: string } }) => {
        if (!p.data) return "";
        const v = p.data.value;
        const rotulo = v === null ? (p.data.status === "sigiloso" ? "sigiloso" : "sem dado") : typeof v === "number" ? `${formatNumero(v)} ${unidade.toLowerCase()}` : v;
        return `${p.data.nome}: <strong>${rotulo}</strong>`;
      },
    },
    visualMap: porCategoria
      ? { type: "piecewise", categories: categorias.map((c) => c.nome), inRange: { color: CORES_CATEGORIA.slice(0, categorias.length) }, left: 0, bottom: 0, textStyle: texto }
      : { type: "continuous", min: valores.length ? Math.min(...valores) : 0, max: valores.length ? Math.max(...valores) : 1, inRange: { color: ESCALA }, text: ["Maior", "Menor"], calculable: false, left: 0, bottom: 0 },
    series: [{ type: "map", map: "rondonia", nameProperty: "codigo_ibge", roam: false, data: dados, emphasis: { label: { show: false } }, select: { disabled: true } }],
  };
}
```

`grafico-observatorio.tsx`:

```tsx
"use client";

import { MapChart, TreemapChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { Grafico } from "@/components/painel/grafico";

echarts.use([MapChart, TreemapChart, VisualMapComponent]);

export function GraficoObservatorio({ option, descricao, altura = 360, idEntrada }: { option: EChartsCoreOption; descricao: string; altura?: number; idEntrada?: string }) {
  return <Grafico option={option} descricao={descricao} altura={altura} alturaMovel={Math.min(altura, 320)} idEntrada={idEntrada} />;
}
```

`mapa-municipios.tsx`:

```tsx
"use client";

import * as echarts from "echarts/core";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import type { MunicipioMapa, Opcao } from "@/lib/api-types";
import { optionMapa } from "@/lib/observatorio-graficos";
import { GraficoObservatorio } from "./grafico-observatorio";

let carregamento: Promise<boolean> | null = null;

function carregarMalha(): Promise<boolean> {
  carregamento ??= fetch("/geo/ro-municipios.json")
    .then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      echarts.registerMap("rondonia", await r.json());
      return true;
    })
    .catch(() => {
      carregamento = null;
      return false;
    });
  return carregamento;
}

export function MapaMunicipios({ municipios, unidade, categorias, descricao }: { municipios: MunicipioMapa[]; unidade: string; categorias: Opcao[]; descricao: string }) {
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");
  useEffect(() => {
    let vivo = true;
    void carregarMalha().then((ok) => vivo && setEstado(ok ? "ok" : "erro"));
    return () => { vivo = false; };
  }, []);
  const option = useMemo(() => optionMapa(municipios, unidade, categorias), [municipios, unidade, categorias]);
  if (estado === "erro") return <Alert>Não foi possível carregar o mapa; veja os dados como tabela.</Alert>;
  if (estado === "carregando") return <div role="status" className="h-[460px] animate-pulse rounded-md bg-surface-alt"><span className="sr-only">Carregando o mapa…</span></div>;
  return <GraficoObservatorio option={option} descricao={descricao} altura={460} />;
}
```

(Confirme a assinatura de `Alert` em `components/ui/feedback.tsx`; se exigir `variant`, use a variante neutra existente.)

- [ ] **Step 4: Rodar** — `npx vitest run src/lib/observatorio-graficos.test.ts src/components/observatorio && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/observatorio-graficos* apps/web/src/components/observatorio
git commit -m "feat(web): gráficos e mapa coroplético dos municípios para o Observatório"
```

---

### Task 15: Front — os quatro blocos

**Files:**
- Create: `apps/web/src/components/observatorio/bloco-panorama.tsx`, `bloco-crescimento.tsx`, `bloco-territorio.tsx`, `bloco-pecuaria.tsx`, `apps/web/src/components/observatorio/use-filtros-bloco.ts`
- Test: `apps/web/src/components/observatorio/blocos.test.tsx`

**Interfaces:**
- Consumes: Tasks 12–14.
- Produces:
  - `useFiltrosBloco(bloco)` → `{ qs: string, definir(chave, valor | null): void, padrao(): void }` (usa `useSearchParams` e `useRouter().replace(..., { scroll: false })`).
  - `<BlocoPanorama />`, `<BlocoCrescimento />`, `<BlocoTerritorio />`, `<BlocoPecuaria />` (sem props; ids de seção `panorama`, `crescimento`, `territorio`, `pecuaria`).

- [ ] **Step 1: Teste que falha**

`blocos.test.tsx` — mock de `next/navigation` e do `fetch`, renderiza `BlocoTerritorio` com um município sigiloso e confere a tabela:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlocoTerritorio } from "./bloco-territorio";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("ter_metrica=valor"),
  useRouter: () => ({ replace }),
  usePathname: () => "/central-de-inteligencia/observatorio",
}));

const resposta = {
  filtros: {
    valores: { metrica: "valor", cultura: null, ano: 2024 },
    opcoes: { metricas: [{ slug: "valor", nome: "Valor da produção", unidade: "Mil Reais" }, { slug: "area", nome: "Área colhida", unidade: "Hectares" }], culturas: [{ slug: "soja-em-grao", nome: "Soja" }], anos: [2023, 2024] },
  },
  metricas: { unidade: "Mil Reais", total: 10, top5_pct: 100, hhi: 5000, concentracao: "alta" },
  series: {
    municipios: [
      { codigo_ibge: "1100023", nome: "Ariquemes", microrregiao: "Ariquemes", valor: 10, status: "ok", categoria: null },
      { codigo_ibge: "1100031", nome: "Cabixi", microrregiao: "Colorado do Oeste", valor: null, status: "sigiloso", categoria: null },
    ],
    microrregioes: [{ nome: "Ariquemes", valor: 10 }], dependentes: [], categorias: [],
  },
  texto: { manchete: "Em 2024, os cinco maiores municípios concentraram 100,0%.", como_ler: ["a", "b"] },
  qualidade: { municipios_sigilosos: 1, ano_ref_monetario: 2024, avisos: [] },
  meta: { fontes: [], atualizado_em: null },
};

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

afterEach(() => { vi.unstubAllGlobals(); replace.mockReset(); });

describe("BlocoTerritorio", () => {
  it("consulta com os filtros do bloco e mostra sigiloso como sigiloso na tabela", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => resposta });
    vi.stubGlobal("fetch", fetchMock);
    render(<BlocoTerritorio />, { wrapper });
    expect(await screen.findByTestId("manchete")).toHaveTextContent("concentraram 100,0%");
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/v1/observatorio/territorio?metrica=valor");
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    const linha = within(screen.getByRole("table")).getByText("Cabixi").closest("tr")!;
    expect(linha).toHaveTextContent("sigiloso");
  });

  it("trocar a métrica grava o filtro na URL com o prefixo do bloco", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => resposta }));
    render(<BlocoTerritorio />, { wrapper });
    await screen.findByTestId("manchete");
    await userEvent.selectOptions(screen.getByLabelText("Métrica"), "area");
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("ter_metrica=area"), { scroll: false });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/components/observatorio/blocos.test.tsx` → FAIL.

- [ ] **Step 3: Implementar**

`use-filtros-bloco.ts`:

```ts
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BlocoObservatorio } from "@/lib/api-types";
import { comFiltro, parametrosDoBloco, semFiltrosDoBloco } from "@/lib/observatorio-url";

export function useFiltrosBloco(bloco: BlocoObservatorio) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ir = (novo: URLSearchParams) => {
    const s = novo.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const atual = new URLSearchParams(sp.toString());
  return {
    qs: parametrosDoBloco(atual, bloco).toString(),
    definir: (chave: string, valor: string | null) => ir(comFiltro(atual, bloco, chave, valor)),
    padrao: () => ir(semFiltrosDoBloco(atual, bloco)),
  };
}
```

`bloco-territorio.tsx`:

```tsx
"use client";

import { GraficoObservatorio } from "./grafico-observatorio";
import { Bloco } from "./bloco";
import { useBlocoObservatorio } from "./consultas";
import { MapaMunicipios } from "./mapa-municipios";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { useFiltrosBloco } from "./use-filtros-bloco";
import { formatNumero } from "@/lib/format";
import { optionBarrasHorizontais } from "@/lib/observatorio-graficos";

const STATUS = { ok: "", sigiloso: "sigiloso", sem_dado: "sem dado" } as const;

export function BlocoTerritorio() {
  const f = useFiltrosBloco("territorio");
  const consulta = useBlocoObservatorio("territorio", f.qs);
  const v = consulta.data?.filtros.valores;
  const o = consulta.data?.filtros.opcoes;
  const filtros = v && o && (
    <>
      <Seletor rotulo="Métrica" valor={v.metrica} onChange={(x) => f.definir("metrica", x)}
        opcoes={o.metricas.map((m) => ({ valor: m.slug, rotulo: m.nome }))} />
      {(v.metrica === "valor" || v.metrica === "area") && (
        <Seletor rotulo="Cultura" valor={v.cultura ?? ""} onChange={(x) => f.definir("cultura", x || null)}
          opcoes={[{ valor: "", rotulo: "Todas as culturas" }, ...o.culturas.map((c) => ({ valor: c.slug, rotulo: c.nome }))]} />
      )}
      <Seletor rotulo="Ano" valor={String(v.ano ?? "")} onChange={(x) => f.definir("ano", x)}
        opcoes={[...o.anos].reverse().map((a) => ({ valor: String(a), rotulo: String(a) }))} />
    </>
  );
  return (
    <Bloco id="territorio" etiqueta="03 · Território" titulo="Onde a produção acontece" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => d.filtros.valores.cultura
        ? `/painel?produto=${d.filtros.valores.cultura}&indicador=${d.filtros.valores.metrica === "area" ? "area-colhida" : "valor-da-producao"}&fim=${d.filtros.valores.ano}`
        : d.filtros.valores.metrica === "rebanho" ? `/painel?produto=bovino&indicador=efetivo&fim=${d.filtros.valores.ano}` : null}
      tabela={(d) => (
        <TabelaDados legenda="Valores por município" colunas={[
          { chave: "nome", rotulo: "Município" }, { chave: "microrregiao", rotulo: "Microrregião" },
          { chave: "valor", rotulo: d.metricas.unidade || "Cultura dominante", numerico: d.filtros.valores.metrica !== "dominante" },
        ]} linhas={(d.series.municipios ?? []).map((m) => ({
          nome: m.nome, microrregiao: m.microrregiao,
          valor: d.filtros.valores.metrica === "dominante"
            ? (d.series.categorias?.find((c) => c.slug === m.categoria)?.nome ?? "sem dado")
            : m.valor ?? STATUS[m.status],
        }))} />
      )}>
      {(d) => (
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <MapaMunicipios municipios={d.series.municipios ?? []} unidade={d.metricas.unidade ?? ""} categorias={d.series.categorias ?? []}
            descricao={`Mapa dos municípios de Rondônia: ${d.texto.manchete}`} />
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-surface-alt p-3"><dt className="text-ink-muted">5 maiores</dt><dd className="text-xl font-semibold">{d.metricas.top5_pct != null ? `${formatNumero(d.metricas.top5_pct)}%` : "–"}</dd></div>
              <div className="rounded-md bg-surface-alt p-3"><dt className="text-ink-muted">HHI</dt><dd className="text-xl font-semibold">{d.metricas.hhi != null ? formatNumero(d.metricas.hhi) : "–"}</dd></div>
            </dl>
            <GraficoObservatorio option={optionBarrasHorizontais(d.series.microrregioes ?? [], d.metricas.unidade ?? "")} descricao="Total por microrregião" altura={280} />
            {(d.series.dependentes?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-semibold">Municípios dependentes de uma cultura</h3>
                <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                  {d.series.dependentes!.map((x) => <li key={x.codigo_ibge}>{x.nome}: {x.cultura} ({formatNumero(x.participacao ?? 0)}%)</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </Bloco>
  );
}
```

`bloco-panorama.tsx`:

```tsx
"use client";

import { Bloco } from "./bloco";
import { useBlocoObservatorio } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { useFiltrosBloco } from "./use-filtros-bloco";
import { formatCompacto, formatNumero } from "@/lib/format";
import { optionAreaEmpilhada, optionTreemap } from "@/lib/observatorio-graficos";

export function BlocoPanorama() {
  const f = useFiltrosBloco("panorama");
  const consulta = useBlocoObservatorio("panorama", f.qs);
  const v = consulta.data?.filtros.valores;
  const o = consulta.data?.filtros.opcoes;
  const filtros = v && o && (
    <>
      <Seletor rotulo="Ano" valor={String(v.ano ?? "")} onChange={(x) => f.definir("ano", x)}
        opcoes={[...o.anos].reverse().map((a) => ({ valor: String(a), rotulo: String(a) }))} />
      <Seletor rotulo="Janela" valor={String(v.janela)} onChange={(x) => f.definir("janela", x)}
        opcoes={o.janelas.map((j) => ({ valor: String(j), rotulo: `${j} anos` }))} />
    </>
  );
  return (
    <Bloco id="panorama" etiqueta="01 · Panorama" titulo="O tamanho e a composição do agro" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={() => "/painel?segmento=agricultura"}
      tabela={(d) => (
        <TabelaDados legenda="Composição do valor da produção" colunas={[
          { chave: "nome", rotulo: "Item" }, { chave: "valor", rotulo: "Mil R$ (reais)", numerico: true }, { chave: "participacao", rotulo: "%", numerico: true },
        ]} linhas={(d.series.composicao ?? []).map((i) => ({ nome: i.nome, valor: i.valor, participacao: i.participacao }))} />
      )}>
      {(d) => (
        <div className="space-y-8">
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ["Valor da produção (mil R$)", d.metricas.valor_total_real != null ? formatCompacto(d.metricas.valor_total_real) : "–"],
              ["Variação real no período", d.metricas.variacao_real_pct != null ? `${formatNumero(d.metricas.variacao_real_pct)}%` : "–"],
              ["Área colhida (ha)", d.metricas.area_colhida_ha != null ? formatCompacto(d.metricas.area_colhida_ha) : "–"],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-md bg-surface-alt p-4"><dt className="text-sm text-ink-muted">{rotulo}</dt><dd className="text-2xl font-semibold">{valor}</dd></div>
            ))}
          </dl>
          <GraficoObservatorio option={optionTreemap(d.series.composicao ?? [], "Mil Reais")} descricao={`Composição do valor da produção: ${d.texto.manchete}`} altura={340} />
          {d.series.evolucao && <GraficoObservatorio option={optionAreaEmpilhada(d.series.evolucao, "Mil R$")} descricao="Evolução da composição do valor da produção, ano a ano" />}
        </div>
      )}
    </Bloco>
  );
}
```

`bloco-crescimento.tsx`:

```tsx
"use client";

import { Bloco } from "./bloco";
import { useBlocoObservatorio } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { useFiltrosBloco } from "./use-filtros-bloco";
import { optionBarrasHorizontais, optionDecomposicao, optionIndices, optionLinha } from "@/lib/observatorio-graficos";

export function BlocoCrescimento() {
  const f = useFiltrosBloco("crescimento");
  const consulta = useBlocoObservatorio("crescimento", f.qs);
  const v = consulta.data?.filtros.valores;
  const o = consulta.data?.filtros.opcoes;
  const anos = o ? [...o.anos].reverse().map((a) => ({ valor: String(a), rotulo: String(a) })) : [];
  const filtros = v && o && (
    <>
      <Seletor rotulo="Cultura" valor={v.cultura ?? ""} onChange={(x) => f.definir("cultura", x)}
        opcoes={o.culturas.map((c) => ({ valor: c.slug, rotulo: c.nome }))} />
      <Seletor rotulo="De" valor={String(v.inicio ?? "")} onChange={(x) => f.definir("inicio", x)} opcoes={anos} />
      <Seletor rotulo="Até" valor={String(v.fim ?? "")} onChange={(x) => f.definir("fim", x)} opcoes={anos} />
    </>
  );
  return (
    <Bloco id="crescimento" etiqueta="02 · Crescimento" titulo="Por que a produção cresceu" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => `/painel?produto=${d.filtros.valores.cultura}&indicador=quantidade-produzida&inicio=${d.filtros.valores.inicio}&fim=${d.filtros.valores.fim}`}
      tabela={(d) => (
        <TabelaDados legenda="Índices de área, rendimento e produção (início = 100) e perda de lavoura" colunas={[
          { chave: "ano", rotulo: "Ano" }, { chave: "area", rotulo: "Área", numerico: true }, { chave: "rendimento", rotulo: "Rendimento", numerico: true },
          { chave: "producao", rotulo: "Produção", numerico: true }, { chave: "perda", rotulo: "Perda (%)", numerico: true },
        ]} linhas={(d.series.indices?.anos ?? []).map((ano, i) => ({
          ano: String(ano), area: d.series.indices!.area[i] ?? null, rendimento: d.series.indices!.rendimento[i] ?? null,
          producao: d.series.indices!.producao[i] ?? null, perda: d.series.perda?.[i]?.valor ?? null,
        }))} />
      )}>
      {(d) => (
        <div className="space-y-8">
          {d.metricas.parte_area_pct != null && d.metricas.parte_rendimento_pct != null && (
            <GraficoObservatorio option={optionDecomposicao(d.metricas.parte_area_pct, d.metricas.parte_rendimento_pct)} descricao={d.texto.manchete} altura={140} />
          )}
          {d.series.indices && <GraficoObservatorio option={optionIndices(d.series.indices)} descricao="Área colhida, rendimento e produção em índice, início do período igual a 100" />}
          <div className="grid gap-8 lg:grid-cols-2">
            <GraficoObservatorio option={optionLinha(d.series.perda ?? [], "Perda de lavoura", "%")} descricao="Perda de lavoura ano a ano" altura={260} />
            <GraficoObservatorio option={optionBarrasHorizontais((d.series.valor_por_hectare ?? []).slice(0, 10), "R$/ha")} descricao="Valor por hectare das culturas no ano final" altura={320} />
          </div>
        </div>
      )}
    </Bloco>
  );
}
```

`bloco-pecuaria.tsx`:

```tsx
"use client";

import { Bloco } from "./bloco";
import { useBlocoObservatorio } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { useFiltrosBloco } from "./use-filtros-bloco";
import { formatCompacto, formatNumero } from "@/lib/format";
import { optionBarrasHorizontais, optionLinha, optionTreemap } from "@/lib/observatorio-graficos";

export function BlocoPecuaria() {
  const f = useFiltrosBloco("pecuaria");
  const consulta = useBlocoObservatorio("pecuaria", f.qs);
  const v = consulta.data?.filtros.valores;
  const o = consulta.data?.filtros.opcoes;
  const anos = o ? [...o.anos].reverse().map((a) => ({ valor: String(a), rotulo: String(a) })) : [];
  const filtros = v && o && (
    <>
      <Seletor rotulo="Rebanho" valor={v.rebanho} onChange={(x) => f.definir("rebanho", x)} opcoes={o.rebanhos.map((r) => ({ valor: r.slug, rotulo: r.nome }))} />
      <Seletor rotulo="De" valor={String(v.inicio ?? "")} onChange={(x) => f.definir("inicio", x)} opcoes={anos} />
      <Seletor rotulo="Até" valor={String(v.fim ?? "")} onChange={(x) => f.definir("fim", x)} opcoes={anos} />
    </>
  );
  return (
    <Bloco id="pecuaria" etiqueta="04 · Pecuária" titulo="Rebanhos e leite" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => `/painel?produto=${d.filtros.valores.rebanho}&indicador=efetivo&inicio=${d.filtros.valores.inicio}&fim=${d.filtros.valores.fim}`}
      tabela={(d) => (
        <TabelaDados legenda="Efetivo por município no ano final" colunas={[{ chave: "nome", rotulo: "Município" }, { chave: "valor", rotulo: "Cabeças", numerico: true }]}
          linhas={(d.series.municipios ?? []).map((m) => ({ nome: m.nome, valor: m.valor }))} />
      )}>
      {(d) => (
        <div className="space-y-8">
          <GraficoObservatorio option={optionLinha(d.series.efetivo ?? [], "Efetivo", "Cabeças")} descricao={d.texto.manchete} altura={300} />
          <div className="grid gap-8 lg:grid-cols-2">
            <GraficoObservatorio option={optionBarrasHorizontais((d.series.municipios ?? []).slice(0, 10), "Cabeças")} descricao="Dez maiores municípios em efetivo" altura={320} />
            <GraficoObservatorio option={optionTreemap(d.series.composicao ?? [], "Cabeças")} descricao="Composição dos rebanhos no ano final" altura={320} />
          </div>
          {d.metricas.leite && (
            <div className="rounded-md border border-line p-5">
              <h3 className="text-lg font-semibold">Leite</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div><dt className="text-sm text-ink-muted">Volume (mil litros)</dt><dd className="text-xl font-semibold">{d.metricas.leite.volume_mil_litros != null ? formatCompacto(d.metricas.leite.volume_mil_litros) : "–"}</dd></div>
                <div><dt className="text-sm text-ink-muted">Litros por vaca/ano</dt><dd className="text-xl font-semibold">{d.metricas.leite.produtividade_l_vaca != null ? formatNumero(d.metricas.leite.produtividade_l_vaca) : "–"}</dd></div>
                <div><dt className="text-sm text-ink-muted">Valor (mil R$, reais)</dt><dd className="text-xl font-semibold">{d.metricas.leite.valor_real != null ? formatCompacto(d.metricas.leite.valor_real) : "–"}</dd></div>
              </dl>
              {(d.series.leite_polos?.length ?? 0) > 0 && (
                <TabelaDados legenda="Polos de leite" colunas={[{ chave: "nome", rotulo: "Município" }, { chave: "volume", rotulo: "Mil litros", numerico: true }, { chave: "produtividade", rotulo: "L/vaca/ano", numerico: true }]}
                  linhas={d.series.leite_polos!.map((p) => ({ nome: p.nome, volume: p.volume, produtividade: p.produtividade }))} />
              )}
            </div>
          )}
        </div>
      )}
    </Bloco>
  );
}
```

- [ ] **Step 4: Rodar** — `npx vitest run src/components/observatorio && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/observatorio
git commit -m "feat(web): blocos Panorama, Crescimento, Território e Pecuária do Observatório"
```

---

### Task 16: Front — página do Observatório, hub da Central e sitemap

**Files:**
- Create: `apps/web/src/content/observatorio.ts`, `apps/web/src/app/central-de-inteligencia/observatorio/page.tsx`
- Modify: `apps/web/src/content/central.ts`, `apps/web/src/app/central-de-inteligencia/page.tsx`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/sitemap.test.ts`
- Test: `apps/web/src/app/central-de-inteligencia/central.test.tsx`, `apps/web/src/app/sitemap.test.ts`

**Interfaces:**
- Consumes: blocos da Task 15; `IndiceSecoes` de `@/components/sobre/indice-secoes`; `HeroPagina`, `Destaque` de `@/components/site/hero-pagina`.
- Produces: `CENTRAL.portas: {titulo, texto, rotulo, href, icone}[]` (Observatório e Painel; `cta_url`/`cta_texto` mantidos porque o Início os usa); rota `/central-de-inteligencia/observatorio` no sitemap.

- [ ] **Step 1: Testes que falham**

`src/app/central-de-inteligencia/central.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CentralPage from "./page";

describe("Central de Inteligência", () => {
  it("é um hub com as portas do Observatório e do Painel", () => {
    render(<CentralPage />);
    expect(screen.getByRole("link", { name: /Abrir o Observatório/ })).toHaveAttribute("href", "/central-de-inteligencia/observatorio");
    expect(screen.getByRole("link", { name: /Abrir o Painel Agro Analítico/ })).toHaveAttribute("href", "/painel");
  });
});
```

`src/app/sitemap.test.ts` — acrescentar `"/central-de-inteligencia/observatorio"` logo depois de `"/central-de-inteligencia"` na lista esperada.

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/app` → FAIL.

- [ ] **Step 3: Implementar**

`src/content/central.ts` — acrescentar ao objeto `CENTRAL` (e `"globe"` não existe em `NomeIcone`: use os ícones já existentes `insight` e `chart`):

```ts
  portas: [
    {
      titulo: "Observatório Agropecuário",
      texto: "Leitura explicada do agro de Rondônia: o tamanho e a composição da produção, por que ela cresce, onde acontece e como vai a pecuária. Valores corrigidos pela inflação.",
      rotulo: "Abrir o Observatório",
      href: "/central-de-inteligencia/observatorio",
      icone: "insight",
    },
    {
      titulo: "Painel Agro Analítico",
      texto: "Consulta objetiva por produto, indicador, município e período, com ranking, série, comparação, análise e relatório em PDF.",
      rotulo: "Abrir o Painel Agro Analítico",
      href: "/painel",
      icone: "chart",
    },
  ] satisfies { titulo: string; texto: string; rotulo: string; href: string; icone: NomeIcone }[],
```

e trocar `subtitulo` por `"Os números do agro de Rondônia, explicados e para consultar"`.

`src/app/central-de-inteligencia/page.tsx` — substituir o `<Revelar>` com parágrafos e o CTA final por:

```tsx
      <Revelar as="section" aria-label="Escolha por onde começar" className="container mt-12 grid gap-6 md:grid-cols-2">
        {c.portas.map((p) => (
          <article key={p.href} className="flex flex-col rounded-2xl border border-line bg-card p-8 shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-white">
              <Icone nome={p.icone} className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold">{p.titulo}</h2>
            <p className="mt-2 flex-1 leading-relaxed text-ink-muted">{p.texto}</p>
            <Link href={p.href} className={cn(buttonVariants({ size: "lg" }), "mt-6 self-start")}>
              {p.rotulo}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </article>
        ))}
      </Revelar>

      <Revelar as="section" className="container mt-12">
        <div className="prose-faperon max-w-3xl text-ink">
          {c.paragrafos.map((p) => <p key={p}>{p}</p>)}
        </div>
      </Revelar>
```

e remover o `Link` do hero (o hero fica só com título e subtítulo).

`src/content/observatorio.ts`:

```ts
export const OBSERVATORIO = {
  titulo: "Observatório Agropecuário",
  subtitulo: "A agropecuária de Rondônia explicada com dados oficiais",
  intro:
    "Cada bloco abre com uma conclusão, mostra o gráfico ou o mapa que a sustenta e explica como ler a métrica. Todos os valores em reais estão corrigidos pela inflação (IPCA). Mude os filtros de qualquer bloco e compartilhe o link: ele reproduz a mesma visão.",
  secoes: [
    { id: "panorama", titulo: "Panorama" },
    { id: "crescimento", titulo: "Por que cresceu" },
    { id: "territorio", titulo: "Território" },
    { id: "pecuaria", titulo: "Pecuária" },
  ],
  seo: {
    titulo: "Observatório Agropecuário",
    descricao: "Composição, crescimento, distribuição territorial e pecuária de Rondônia com dados do IBGE corrigidos pela inflação.",
  },
};
```

`src/app/central-de-inteligencia/observatorio/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { BlocoCrescimento } from "@/components/observatorio/bloco-crescimento";
import { BlocoPanorama } from "@/components/observatorio/bloco-panorama";
import { BlocoPecuaria } from "@/components/observatorio/bloco-pecuaria";
import { BlocoTerritorio } from "@/components/observatorio/bloco-territorio";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { IndiceSecoes } from "@/components/sobre/indice-secoes";
import { Skeleton } from "@/components/ui/feedback";
import { OBSERVATORIO as c } from "@/content/observatorio";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: "/central-de-inteligencia/observatorio" },
};

export default function ObservatorioPage() {
  return (
    <>
      <HeroPagina id="observatorio-titulo" atual={c.titulo} titulo={<>O agro de Rondônia, <Destaque>explicado</Destaque>.</>}>
        <p>{c.intro}</p>
      </HeroPagina>
      <div className="border-t-2 border-ink">
        <div className="container grid gap-10 lg:grid-cols-[12rem_1fr]">
          <IndiceSecoes secoes={c.secoes} />
          <Suspense fallback={<div role="status" className="py-12"><span className="sr-only">Carregando o Observatório…</span><Skeleton className="h-64 w-full" /></div>}>
            <div className="min-w-0 space-y-16 pb-8">
              <BlocoPanorama />
              <BlocoCrescimento />
              <BlocoTerritorio />
              <BlocoPecuaria />
            </div>
          </Suspense>
        </div>
      </div>
    </>
  );
}
```

`src/app/sitemap.ts` — inserir `"/central-de-inteligencia/observatorio"` depois de `"/central-de-inteligencia"`.

- [ ] **Step 4: Rodar** — `npm test && npm run typecheck && npm run lint` → PASS. (Se o teste existente do Início, `banners`/`hero`, quebrar por depender de `CENTRAL.cta_*`, confirme que esses campos continuam existindo.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): Central de Inteligência como hub e página do Observatório"
```

---

### Task 17: Mock da API, E2E, contrato e publicação na demo

**Files:**
- Modify: `apps/web/scripts/mock-api.mjs`, `docs/api-contract.md`
- Create: `apps/web/e2e/observatorio.spec.ts`

**Interfaces:**
- Consumes: tudo acima.
- Produces: mock com as quatro rotas `/api/v1/observatorio/*` (dados fictícios no formato exato do contrato, com os 52 municípios do mock e um sigiloso); E2E da jornada; contrato documentado.

- [ ] **Step 1: E2E que falha**

`apps/web/e2e/observatorio.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("Central → Observatório → filtro na URL → link reproduz → Painel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/central-de-inteligencia");
  await page.getByRole("link", { name: /Abrir o Observatório/ }).click();
  await expect(page).toHaveURL(/\/central-de-inteligencia\/observatorio$/);

  const territorio = page.getByRole("region", { name: "Onde a produção acontece" });
  await expect(territorio.getByTestId("manchete")).toBeVisible();
  await territorio.getByLabel("Métrica").selectOption("area");
  await expect(page).toHaveURL(/ter_metrica=area/);

  await page.reload();
  await expect(page.getByRole("region", { name: "Onde a produção acontece" }).getByLabel("Métrica")).toHaveValue("area");

  await territorio.getByRole("button", { name: "Ver como tabela" }).click();
  await expect(territorio.getByRole("table")).toContainText("sigiloso");

  const serias = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  expect(serias).toEqual([]);

  const crescimento = page.getByRole("region", { name: "Por que a produção cresceu" });
  await crescimento.getByRole("link", { name: /Ver no Painel/ }).click();
  await expect(page).toHaveURL(/\/painel\?produto=.*indicador=quantidade-produzida/);
});

test("parâmetro inválido em um bloco não derruba os outros", async ({ page }) => {
  await page.goto("/central-de-inteligencia/observatorio?pan_janela=7");
  const panorama = page.getByRole("region", { name: "O tamanho e a composição do agro" });
  await expect(panorama.getByRole("button", { name: "Voltar ao padrão" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rebanhos e leite" }).getByTestId("manchete")).toBeVisible();
  await panorama.getByRole("button", { name: "Voltar ao padrão" }).click();
  await expect(page).not.toHaveURL(/pan_janela/);
  await expect(panorama.getByTestId("manchete")).toBeVisible();
});
```

- [ ] **Step 2: Rodar e ver falhar** — `cd apps/web && npx playwright test e2e/observatorio.spec.ts` → FAIL (mock sem as rotas).

- [ ] **Step 3: Implementar o mock**

Em `scripts/mock-api.mjs`, acrescentar funções que montam respostas no formato das Tasks 8–11 a partir de `MUNICIPIOS` (o primeiro município com `status: "sigiloso"` e `valor: null` no Território), e registrar no roteador do servidor (seguindo o padrão das rotas existentes no arquivo):

```js
const META_OBS = { fontes: [{ fonte: "IBGE – Pesquisa Agrícola Municipal (PAM)", tabela_sidra: 5457, url_fonte: "https://sidra.ibge.gov.br/Tabela/5457" }], atualizado_em: "2026-10-01T12:00:00Z" };
const qualidade = (avisos = []) => ({ municipios_sigilosos: 1, ano_ref_monetario: 2024, avisos });
const comoLer = ["Explicação fictícia do mock.", "Segunda explicação."];
const ANOS = Array.from({ length: 10 }, (_, i) => 2015 + i);
const invalido = (campo) => ({ status: 400, corpo: { erro: "Parâmetros inválidos", campos: { [campo]: "valor inválido" } } });

function observatorio(bloco, q) {
  if (bloco === "panorama") {
    const janela = Number(q.get("janela") ?? 10);
    if (![5, 10, 20].includes(janela)) return invalido("janela");
    const composicao = [["soja-em-grao", "Soja (em grão)", 45], ["cafe-em-grao-canephora", "Café canéfora", 20], ["milho-em-grao", "Milho (em grão)", 15], ["leite", "Leite", 12], ["demais", "Demais produtos", 8]]
      .map(([slug, nome, p]) => ({ slug, nome, valor: p * 1000, participacao: p }));
    return { status: 200, corpo: {
      filtros: { valores: { ano: 2024, janela, inicio: 2024 - janela + 1 }, opcoes: { anos: ANOS, janelas: [5, 10, 20] } },
      metricas: { valor_total_real: 100000, valor_lavouras_real: 88000, valor_origem_animal_real: 12000, variacao_real_pct: 42.5, area_colhida_ha: 1500000 },
      series: { composicao, evolucao: { anos: ANOS, itens: composicao.map((c) => ({ slug: c.slug, nome: c.nome, valores: ANOS.map((_, i) => c.valor * (0.6 + i * 0.04)) })) } },
      texto: { manchete: "Em 2024, Soja (em grão) respondeu por 45,0% do valor da produção agropecuária de Rondônia (mock).", como_ler: comoLer },
      qualidade: qualidade(["O valor não inclui carne bovina (mock)."]), meta: META_OBS,
    } };
  }
  if (bloco === "crescimento") {
    return { status: 200, corpo: {
      filtros: { valores: { cultura: q.get("cultura") ?? "soja-em-grao", inicio: 2015, fim: 2024 }, opcoes: { culturas: [{ slug: "soja-em-grao", nome: "Soja (em grão)" }, { slug: "cafe-em-grao-canephora", nome: "Café canéfora" }], anos: ANOS } },
      metricas: { variacao_producao_pct: 120, parte_area_pct: 35, parte_rendimento_pct: 65, perda_media_pct: 2.1, perda_ultimo_ano_pct: 1.8 },
      series: { indices: { anos: ANOS, area: ANOS.map((_, i) => 100 + i * 4), rendimento: ANOS.map((_, i) => 100 + i * 7), producao: ANOS.map((_, i) => 100 + i * 12) },
        perda: ANOS.map((ano, i) => ({ ano, valor: 1 + (i % 3) })), valor_por_hectare: [{ slug: "cafe-em-grao-canephora", nome: "Café canéfora", valor: 18000, participacao: null }, { slug: "soja-em-grao", nome: "Soja (em grão)", valor: 6500, participacao: null }] },
      texto: { manchete: "A produção de Soja (em grão) cresceu 120,0% entre 2015 e 2024 (mock).", como_ler: comoLer },
      qualidade: qualidade(), meta: META_OBS,
    } };
  }
  if (bloco === "territorio") {
    const metrica = q.get("metrica") ?? "valor";
    if (!["valor", "area", "rebanho", "dominante"].includes(metrica)) return invalido("metrica");
    const municipios = MUNICIPIOS.map((m, i) => ({ codigo_ibge: m.codigo_ibge, nome: m.nome, microrregiao: i % 2 ? "Ariquemes" : "Cacoal",
      valor: i === 0 ? null : (52 - i) * 100, status: i === 0 ? "sigiloso" : "ok", categoria: metrica === "dominante" && i > 0 ? (i % 2 ? "soja-em-grao" : "cafe-em-grao-canephora") : null }));
    return { status: 200, corpo: {
      filtros: { valores: { metrica, cultura: null, ano: 2024 }, opcoes: { metricas: [["valor", "Valor da produção", "Mil Reais"], ["area", "Área colhida", "Hectares"], ["rebanho", "Rebanho bovino", "Cabeças"], ["dominante", "Cultura dominante", ""]].map(([slug, nome, unidade]) => ({ slug, nome, unidade })), culturas: [{ slug: "soja-em-grao", nome: "Soja (em grão)" }], anos: ANOS } },
      metricas: { unidade: metrica === "area" ? "Hectares" : "Mil Reais", total: 130000, top5_pct: 38.4, hhi: 520, concentracao: "baixa" },
      series: { municipios, microrregioes: [{ nome: "Ariquemes", valor: 70000 }, { nome: "Cacoal", valor: 60000 }], dependentes: [{ codigo_ibge: MUNICIPIOS[1].codigo_ibge, nome: MUNICIPIOS[1].nome, cultura: "Soja (em grão)", participacao: 71.2 }],
        categorias: metrica === "dominante" ? [{ slug: "soja-em-grao", nome: "Soja (em grão)" }, { slug: "cafe-em-grao-canephora", nome: "Café canéfora" }] : [] },
      texto: { manchete: "Em 2024, os cinco maiores municípios concentraram 38,4% (mock).", como_ler: comoLer },
      qualidade: qualidade(), meta: META_OBS,
    } };
  }
  return { status: 200, corpo: {
    filtros: { valores: { rebanho: q.get("rebanho") ?? "bovino", inicio: 2015, fim: 2024 }, opcoes: { rebanhos: [{ slug: "bovino", nome: "Bovino" }, { slug: "suino-total", nome: "Suíno - total" }], anos: ANOS } },
    metricas: { efetivo_final: 18000000, variacao_pct: 30.2, top5_pct: 25.1, leite: { volume_mil_litros: 900000, valor_real: 1500000, produtividade_l_vaca: 1900, variacao_produtividade_pct: 22.4 } },
    series: { efetivo: ANOS.map((ano, i) => ({ ano, valor: 14000000 + i * 400000 })), municipios: MUNICIPIOS.slice(0, 10).map((m, i) => ({ codigo_ibge: m.codigo_ibge, nome: m.nome, valor: 1000000 - i * 50000 })),
      composicao: [{ slug: "bovino", nome: "Bovino", valor: 18000000, participacao: 90 }, { slug: "suino-total", nome: "Suíno - total", valor: 2000000, participacao: 10 }],
      leite_polos: MUNICIPIOS.slice(0, 5).map((m, i) => ({ codigo_ibge: m.codigo_ibge, nome: m.nome, volume: 90000 - i * 5000, produtividade: 2100 - i * 50 })) },
    texto: { manchete: "O rebanho bovino cresceu 30,2% entre 2015 e 2024 (mock).", como_ler: comoLer },
    qualidade: qualidade(), meta: META_OBS,
  } };
}
```

No roteamento do mock, antes do 404 final: se o caminho casar com `^/api/v1/observatorio/(panorama|crescimento|territorio|pecuaria)$`, responder `observatorio(bloco, url.searchParams)` com o `status` e o `corpo` devolvidos (use o mesmo helper de resposta JSON das outras rotas do arquivo).

`docs/api-contract.md` — nova seção `## Observatório` com as quatro rotas, parâmetros, padrões, a forma comum `{filtros, metricas, series, texto, qualidade, meta}`, os campos de cada bloco (copiar das Interfaces das Tasks 8–11) e os códigos de erro.

- [ ] **Step 2b: Rodar E2E** — `npx playwright test e2e/observatorio.spec.ts` → PASS; depois a suíte inteira `npm run test:e2e` → PASS (o `fluxo.spec.ts` não pode quebrar com a nova Central: se ele clicar no CTA do hero da Central, troque o seletor para `getByRole("link", { name: /Abrir o Painel Agro Analítico/ })`, que continua existindo na porta do Painel).

- [ ] **Step 3: Verificação final completa**

```bash
make test && make lint && make typecheck && make web-test
```

Expected: tudo PASS.

- [ ] **Step 4: Publicar na demo** (memória do projeto: toda mudança visual vai para a demo)

```bash
docker compose up -d --build api web
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/central-de-inteligencia/observatorio
for b in panorama crescimento territorio pecuaria; do curl -s -o /dev/null -w "$b %{http_code} %{time_total}\n" "http://localhost:3000/api/v1/observatorio/$b"; done
```

Expected: 200 em tudo, tempos ≤ 0,5 s. Abrir a página no navegador, conferir os quatro blocos, o mapa e o modo escuro; registrar uma captura.

- [ ] **Step 5: Commit**

```bash
git add apps/web/scripts/mock-api.mjs apps/web/e2e/observatorio.spec.ts docs/api-contract.md
git commit -m "test(web): jornada E2E do Observatório e contrato da API documentado"
```
