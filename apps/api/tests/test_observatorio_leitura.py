from decimal import Decimal as D

import pytest

from observatorio import leitura as l

pytestmark = pytest.mark.django_db


def test_ipca_e_anos(dados_observatorio: dict) -> None:
    assert l.indices_ipca() == {1995: D(1000), 1996: D(1200), 2015: D(4000), 2024: D(6000), 2025: D(6300)}
    assert l.ultimo_ano("valor-da-producao", 5457) == 2024
    assert l.anos_disponiveis("valor-da-producao", 5457) == [1996, 2015, 2024]


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


def test_por_municipio_na_janela(dados_observatorio: dict) -> None:
    t = l.por_municipio_na_janela("area-plantada", 5457, "cafe-em-grao-canephora", 2015, 2024)
    assert t == {2015: {"1100023": D(50)}, 2024: {"1100023": D(50)}}
    t = l.por_municipio_na_janela("area-colhida", 5457, "soja-em-grao", 2024, 2024)
    assert t == {2024: {"1100015": D(110), "1100023": D(1000)}}
    assert l.por_municipio_na_janela("area-colhida", 5457, "soja-em-grao", 2000, 2010) == {}


def test_codigos_sigilosos(dados_observatorio: dict) -> None:
    assert l.codigos_sigilosos("valor-da-producao", 5457, 2024) == ["1100031"]
    assert l.codigos_sigilosos("valor-da-producao", 5457, 2024, "cafe-em-grao-canephora") == []
