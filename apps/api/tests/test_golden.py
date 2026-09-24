"""Números de ouro: valores conferidos manualmente no SIDRA (tabela 5457, soja, 2024).

Bloqueiam a publicação se a ingestão ou o ranking divergirem do IBGE.
"""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from indicadores import servicos
from ingestao.servico import executar_carga
from tests.conftest import ClienteFalso

pytestmark = [pytest.mark.django_db, pytest.mark.golden]

OURO_2024 = {
    "1101468": ("Pimenteiras do Oeste", 197220),
    "1100072": ("Corumbiara", 183546),
    "1100924": ("Chupinguaia", 169820),
    "1100205": ("Porto Velho", 163234),
    "1100304": ("Vilhena", 147842),
    "1100056": ("Cerejeiras", 133866),
}
TOTAL_2024 = 2_221_610
Q = "produto=soja-em-grao&indicador=quantidade-produzida&inicio=2023&fim=2024"


@pytest.fixture
def ouro(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)


def test_valores_por_municipio_batem_com_o_sidra(ouro: None, api: APIClient) -> None:
    corpo = api.get(f"/api/v1/ranking?{Q}").json()
    por_codigo = {i["municipio"]["codigo_ibge"]: i for i in corpo["itens"]}
    for codigo, (nome, valor) in OURO_2024.items():
        item = por_codigo[codigo]
        assert item["municipio"]["nome"] == nome
        assert item["valor"] == valor, nome


def test_ranking_2024_top6_e_total_estadual(ouro: None, api: APIClient) -> None:
    corpo = api.get(f"/api/v1/ranking?{Q}").json()
    assert [i["municipio"]["nome"] for i in corpo["itens"][:6]] == [
        n for n, _ in OURO_2024.values()
    ]
    assert corpo["total_estadual"] == TOTAL_2024
    assert len(corpo["itens"]) == 52 and corpo["itens"][0]["percentual_total"] == pytest.approx(
        8.88
    )
    assert corpo["ano_referencia"] == 2024


def test_ranking_de_2023_usa_os_dados_de_2023(ouro: None, api: APIClient) -> None:
    corpo = api.get(
        "/api/v1/ranking?produto=soja-em-grao&indicador=quantidade-produzida&inicio=2023&fim=2023"
    ).json()
    assert (
        corpo["itens"][0]["valor"] == 181812
        and corpo["itens"][0]["municipio"]["nome"] == "Porto Velho"
    )


def test_ausente_do_ibge_nunca_vira_zero(ouro: None) -> None:
    recorte = servicos.obter_recorte("soja-em-grao", "quantidade-produzida")
    presidente_medici = servicos.serie(recorte, 2023, 2024, servicos.obter_municipio("1100254"))
    assert [(p.valor, p.status) for p in presidente_medici] == [(None, "inexistente")] * 2


def test_total_da_serie_de_ro_bate_com_ranking(ouro: None) -> None:
    recorte = servicos.obter_recorte("soja-em-grao", "quantidade-produzida")
    total_2024 = servicos.serie(recorte, 2024, 2024)[0].valor
    assert total_2024 == Decimal(TOTAL_2024)
