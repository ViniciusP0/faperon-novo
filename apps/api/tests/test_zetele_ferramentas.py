import json

import pytest

from analise.regras import formatar_numero
from indicadores.models import Produto
from zetele.ferramentas import DEFINICOES, ErroDeFerramenta, executar

URL_SOJA = "/painel?segmento=agricultura&produto=soja-em-grao&indicador=quantidade-produzida&fim=2024"


def test_definicoes_sao_estritas() -> None:
    nomes = [d["name"] for d in DEFINICOES]
    assert nomes == ["ranking_municipios", "evolucao_e_analise", "bloco_observatorio"]
    for d in DEFINICOES:
        assert d["strict"] is True
        assert d["input_schema"]["additionalProperties"] is False


@pytest.mark.django_db
def test_ranking_devolve_formatados_fonte_e_link(dados_soja: Produto) -> None:
    r = executar("ranking_municipios", {"produto": "soja-em-grao", "indicador": "quantidade-produzida"})
    assert r.dados["ano_referencia"] == 2024
    primeiro = r.dados["itens"][0]
    assert primeiro["municipio"] == "Ariquemes"
    assert primeiro["valor_formatado"] == formatar_numero(450)
    assert r.dados["municipios_sigilosos"] == 1
    assert r.dados["url_painel"] == URL_SOJA
    assert r.urls == frozenset({URL_SOJA})
    assert r.fontes[0]["url_interna"] == URL_SOJA
    assert "5457" in r.fontes[0]["rotulo"]
    assert "Ariquemes" in r.resumo and formatar_numero(450) in r.resumo
    json.dumps(r.dados, ensure_ascii=False, default=str)  # serializável para o tool_result


@pytest.mark.django_db
def test_ranking_respeita_quantos_e_nome_com_caixa_diferente(dados_soja: Produto) -> None:
    r = executar("Ranking_Municipios", {"produto": "soja-em-grao", "indicador": "quantidade-produzida", "quantos": 1})
    assert len(r.dados["itens"]) == 1


@pytest.mark.django_db
def test_evolucao_usa_a_analise_deterministica(dados_soja: Produto) -> None:
    r = executar("evolucao_e_analise", {"produto": "soja-em-grao", "indicador": "quantidade-produzida", "inicio": 2022, "fim": 2024})
    assert r.dados["paragrafos"]
    assert r.dados["url_painel"].endswith("&inicio=2022&fim=2024&aba=analise")
    assert r.resumo == r.dados["paragrafos"][0]


@pytest.mark.django_db
def test_observatorio_devolve_manchete_e_link_com_ancora(dados_observatorio: dict[str, Produto]) -> None:
    r = executar("bloco_observatorio", {"bloco": "panorama"})
    assert r.dados["manchete"]
    url = r.dados["url_observatorio"]
    assert url.startswith("/central-de-inteligencia/observatorio") and url.endswith("#panorama")
    assert r.resumo == r.dados["manchete"]


@pytest.mark.django_db
def test_observatorio_so_leva_ao_link_os_filtros_do_bloco(dados_observatorio: dict[str, Produto]) -> None:
    # filtro de outro bloco (rebanho no panorama) não vira parâmetro do link
    r = executar("bloco_observatorio", {"bloco": "panorama", "janela": 5, "rebanho": "bovino"})
    assert r.dados["url_observatorio"] == "/central-de-inteligencia/observatorio?pan_janela=5#panorama"
    assert r.urls == frozenset({r.dados["url_observatorio"]})


@pytest.mark.django_db
def test_erros_de_dominio_viram_erro_de_ferramenta(dados_soja: Produto) -> None:
    with pytest.raises(ErroDeFerramenta):
        executar("ranking_municipios", {"produto": "nao-existe", "indicador": "quantidade-produzida"})
    with pytest.raises(ErroDeFerramenta):
        executar("ferramenta_inventada", {})
