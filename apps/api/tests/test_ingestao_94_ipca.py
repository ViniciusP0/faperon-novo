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
