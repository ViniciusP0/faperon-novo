"""Correções da revisão final do Observatório (F1-F11)."""

import time
from decimal import Decimal as D

import pytest
from rest_framework.test import APIClient

from indicadores.models import Produto
from ingestao.models import Carga
from tests.conftest import lancar

pytestmark = pytest.mark.django_db


def get(api: APIClient, caminho: str) -> tuple[int, dict]:
    resposta = api.get(f"/api/v1/observatorio/{caminho}")
    return resposta.status_code, resposta.json()


# F1 -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "qs",
    [
        "crescimento?inicio=1974&fim=2000000000",
        "crescimento?inicio=2000000000&fim=2000000000",
        "pecuaria?inicio=1974&fim=2000000000",
        "pecuaria?fim=2000000000",
        "panorama?ano=2000000000",
        "territorio?ano=2000000000",
    ],
)
def test_ano_gigante_e_400_e_rapido(api: APIClient, dados_observatorio: dict, qs: str) -> None:
    t0 = time.monotonic()
    status, corpo = get(api, qs)
    assert status == 400 and corpo["campos"]
    assert time.monotonic() - t0 < 2


def test_janela_fora_dos_dados_continua_200_com_serie_nula(
    api: APIClient, dados_observatorio: dict
) -> None:
    status, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=2090&fim=2100")
    assert status == 200
    assert corpo["metricas"]["variacao_producao_pct"] is None
    assert all(v is None for v in corpo["series"]["indices"]["producao"])
    status, corpo = get(api, "pecuaria?inicio=2090&fim=2100")
    assert status == 200
    assert all(p["valor"] is None for p in corpo["series"]["efetivo"])
    assert len(corpo["series"]["efetivo"]) <= 11


def test_janela_iterada_fica_dentro_dos_anos_com_dado(
    api: APIClient, dados_observatorio: dict
) -> None:
    # dados em 2015 e 2024: pedir 1980..2090 não gera 111 pontos
    _, corpo = get(api, "pecuaria?inicio=1980&fim=2090")
    assert [p["ano"] for p in corpo["series"]["efetivo"]][0] == 2015
    assert [p["ano"] for p in corpo["series"]["efetivo"]][-1] == 2024
    _, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=1980&fim=2090")
    assert corpo["series"]["indices"]["anos"][0] == 2015
    assert corpo["series"]["indices"]["anos"][-1] == 2024


# F2 -----------------------------------------------------------------------


def test_territorio_valor_e_rotulado_como_valor_das_lavouras(
    api: APIClient, dados_observatorio: dict
) -> None:
    from observatorio import regras as r

    _, corpo = get(api, "territorio")
    nomes = {m["slug"]: m["nome"] for m in corpo["filtros"]["opcoes"]["metricas"]}
    assert nomes["valor"] == "Valor da produção das lavouras"
    assert "do valor das lavouras" in corpo["texto"]["manchete"]
    como_ler = " ".join(corpo["texto"]["como_ler"])
    assert "afeta toda a economia local" not in como_ler
    assert "pesa muito na renda agrícola do município" in como_ler
    assert r.NOMES_METRICA["dominante"] == "do valor das lavouras"


# F3 -----------------------------------------------------------------------


def test_pecuaria_composicao_mantem_agregado_e_tira_subconjunto(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    valores = {
        "galinaceos-total": 7900,
        "galinaceos-galinhas": 2350,
        "suino-total": 600,
        "suino-matrizes-de-suinos": 100,
    }
    for slug, valor in valores.items():
        p = Produto.objects.create(
            slug=slug, codigo_ibge=slug[:12], nome=slug, segmento="pecuaria", tabela_origem=3939
        )
        lancar(p, "efetivo", "1100015", 2024, valor, carga)
    _, corpo = get(api, "pecuaria")
    comp = [(i["slug"], i["valor"], i["participacao"]) for i in corpo["series"]["composicao"]]
    assert comp == [
        ("galinaceos-total", 7900.0, 75.2),
        ("bovino", 2000.0, 19.0),
        ("suino-total", 600.0, 5.7),
    ]


# F7 -----------------------------------------------------------------------


@pytest.mark.parametrize("metrica", ["area", "rebanho"])
def test_manchete_sem_dependentes_fora_de_valor_e_dominante(metrica: str) -> None:
    from observatorio import regras as r

    texto = r.manchete_territorio(metrica, 2024, D("72.5"), "Ariquemes", 3)
    assert "depend" not in texto


@pytest.mark.parametrize("metrica", ["valor", "dominante"])
def test_manchete_com_dependentes_em_valor_e_dominante(metrica: str) -> None:
    from observatorio import regras as r

    assert "3 municípios dependem de uma só cultura" in r.manchete_territorio(
        metrica, 2024, D("72.5"), "Ariquemes", 3
    )


def test_territorio_area_nao_cita_dependencia(api: APIClient, dados_observatorio: dict) -> None:
    _, corpo = get(api, "territorio?metrica=area")
    assert "depend" not in corpo["texto"]["manchete"]


# F8 -----------------------------------------------------------------------


def test_panorama_nao_oferece_anos_antes_de_1995(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    lancar(dados_observatorio["soja"], "valor-da-producao", "1100015", 1994, 50, carga)
    _, corpo = get(api, "panorama")
    assert corpo["filtros"]["opcoes"]["anos"] == [1996, 2015, 2024]
    status, erro = get(api, "panorama?ano=1994")
    assert status == 400 and "ano" in erro["campos"]


def test_panorama_so_com_anos_antigos_vem_vazio(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    from indicadores.models import Medicao

    Medicao.objects.filter(
        indicador__slug="valor-da-producao", produto__tabela_origem=5457, ano__gte=1997
    ).delete()
    lancar(dados_observatorio["soja"], "valor-da-producao", "1100015", 1990, 10, carga)
    Medicao.objects.filter(ano=1996, indicador__slug="valor-da-producao").delete()
    status, corpo = get(api, "panorama")
    assert status == 200
    assert corpo["series"] == {} and corpo["filtros"]["opcoes"]["anos"] == []


def test_crescimento_fim_antes_de_1995_avisa_e_nao_diz_precos_de(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    from observatorio import regras as r

    soja = dados_observatorio["soja"]
    lancar(soja, "area-colhida", "1100015", 1990, 100, carga)
    lancar(soja, "quantidade-produzida", "1100015", 1990, 100, carga)
    lancar(soja, "area-colhida", "1100015", 1992, 100, carga)
    lancar(soja, "quantidade-produzida", "1100015", 1992, 150, carga)
    _, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=1990&fim=1992")
    assert corpo["qualidade"]["ano_ref_monetario"] is None
    assert r.aviso_antes_do_plano_real(1992) in corpo["qualidade"]["avisos"]
    assert not any("preços de" in a for a in corpo["qualidade"]["avisos"])
    assert "a preços de" not in " ".join(corpo["texto"]["como_ler"])
    assert corpo["series"]["valor_por_hectare"] == []
    assert corpo["metricas"]["variacao_producao_pct"] == 50.0


def test_aviso_antes_do_plano_real() -> None:
    from observatorio import regras as r

    assert r.aviso_antes_do_plano_real(1992) == (
        "Antes de 1995 (Plano Real) não há como corrigir valores pelo IPCA; "
        "o valor por hectare não é calculado para 1992."
    )


# F9 / F10 -------------------------------------------------------------------


def test_como_ler_pecuaria_cita_ano_de_referencia() -> None:
    from observatorio import regras as r

    textos = r.como_ler("pecuaria", 2024)
    assert len(textos) == 3
    assert textos[2] == "O valor do leite está a preços de 2024."
    assert r.como_ler("pecuaria", None)[2] == "O valor do leite está sem correção monetária."


def test_como_ler_panorama_explica_area_colhida() -> None:
    from observatorio import regras as r

    textos = r.como_ler("panorama", 2024)
    assert len(textos) == 3
    assert textos[2] == (
        "A área colhida soma a área de cada cultura no ano (soma por cultura); "
        "como inclui a segunda safra, pode superar a área física cultivada."
    )


# F11 ----------------------------------------------------------------------


def test_cafe_arabica_tambem_sai_quando_ha_total(dados_observatorio: dict, carga: Carga) -> None:
    from indicadores.models import Indicador, ProdutoIndicador
    from observatorio import leitura as lei

    ind = Indicador.objects.get(slug="valor-da-producao")
    for slug in ("cafe-em-grao-total", "cafe-em-grao-arabica"):
        p = Produto.objects.create(
            slug=slug, codigo_ibge=slug, nome=slug, segmento="agricultura", tabela_origem=5457
        )
        ProdutoIndicador.objects.create(produto=p, indicador=ind, unidade="Mil Reais")
        lancar(p, "valor-da-producao", "1100049", 2024, 70 if "arabica" in slug else 100, carga)
    assert lei.componentes_duplicados(5457) == {"cafe-em-grao-canephora", "cafe-em-grao-arabica"}
    sem = lei.totais_por_produto("valor-da-producao", 5457, 2024, 2024, sem_duplicados=True)
    assert "cafe-em-grao-arabica" not in sem and sem["cafe-em-grao-total"] == {2024: D(100)}


def test_cafe_arabica_fica_sem_total(dados_observatorio: dict) -> None:
    from observatorio import leitura as lei

    Produto.objects.create(
        slug="cafe-em-grao-arabica",
        codigo_ibge="a",
        nome="a",
        segmento="agricultura",
        tabela_origem=5457,
    )
    assert lei.componentes_duplicados(5457) == frozenset()
