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
