from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from indicadores.models import IndicePreco, Medicao, Produto
from ingestao import snapshot
from ingestao.parser import medias_anuais, parsear_dados, parsear_indice_mensal
from ingestao.servico import executar_carga
from ingestao.servico_indice import executar_carga_ipca
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


class ClienteIpca:
    def __init__(self, resposta: list[dict[str, Any]]) -> None:
        self.resposta = resposta
        self.chamadas = 0

    def serie_nacional(self, tabela: int, variavel: str) -> list[dict[str, Any]]:
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
def test_snapshot_leva_e_traz_o_ipca(tmp_path: Path) -> None:
    executar_carga_ipca(ClienteIpca(carregar_fixture("sidra_1737_ipca_2024_2025.json")))
    antes = dict(IndicePreco.objects.values_list("ano", "indice_medio"))
    destino = tmp_path / "s.json.gz"
    snapshot.gerar(destino)
    snapshot.restaurar(destino, forcar=True)
    assert dict(IndicePreco.objects.values_list("ano", "indice_medio")) == antes
