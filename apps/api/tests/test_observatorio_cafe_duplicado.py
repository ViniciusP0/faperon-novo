"""PAM 5457: o café Total já contém o Canephora; somas entre produtos contam uma vez só."""

from decimal import Decimal as D

import pytest
from rest_framework.test import APIClient

from indicadores.models import Medicao, Produto, ProdutoIndicador
from observatorio import leitura as l

pytestmark = pytest.mark.django_db

COMPONENTE = "cafe-em-grao-canephora"
TOTAL = "cafe-em-grao-total"


@pytest.fixture
def com_total(dados_observatorio: dict) -> Produto:
    """Cria o agregado 'Café Total' com valores IDÊNTICOS aos do componente (como no SIDRA)."""
    componente = Produto.objects.get(slug=COMPONENTE)
    total = Produto.objects.create(
        slug=TOTAL,
        codigo_ibge="40138",
        nome="Café (em grão) Total",
        segmento="agricultura",
        tabela_origem=5457,
    )
    for pi in ProdutoIndicador.objects.filter(produto=componente):
        ProdutoIndicador.objects.create(produto=total, indicador=pi.indicador, unidade=pi.unidade)
    for m in Medicao.objects.filter(produto=componente):
        Medicao.objects.create(
            produto=total,
            indicador=m.indicador,
            municipio_id=m.municipio_id,
            ano=m.ano,
            valor=m.valor,
            status_valor=m.status_valor,
            carga=m.carga,
        )
    return total


def get(api: APIClient, caminho: str) -> dict:
    resposta = api.get(f"/api/v1/observatorio/{caminho}")
    assert resposta.status_code == 200
    return resposta.json()


def test_leitura_exclui_componente_quando_ha_total(com_total: Produto) -> None:
    assert l.por_municipio("valor-da-producao", 5457, 2024) == {
        "1100015": D(1200), "1100023": D(3600), "1100049": D(900)
    }
    assert l.por_municipio("valor-da-producao", 5457, 2024, COMPONENTE) == {
        "1100023": D(600), "1100049": D(900)
    }
    por_prod = l.por_municipio_e_produto("valor-da-producao", 5457, 2024)
    assert por_prod["1100023"] == {"soja-em-grao": D(3000), TOTAL: D(600)}
    assert COMPONENTE not in por_prod["1100049"]


def test_leitura_mantem_componente_sem_total(dados_observatorio: dict) -> None:
    assert l.por_municipio("valor-da-producao", 5457, 2024)["1100023"] == D(3600)
    assert COMPONENTE in l.por_municipio_e_produto("valor-da-producao", 5457, 2024)["1100023"]


def test_leitura_totais_por_produto_so_exclui_a_pedido(com_total: Produto) -> None:
    com = l.totais_por_produto("valor-da-producao", 5457, 2024, 2024)
    assert COMPONENTE in com and TOTAL in com
    sem = l.totais_por_produto("valor-da-producao", 5457, 2024, 2024, sem_duplicados=True)
    assert COMPONENTE not in sem and sem[TOTAL] == {2024: D(1500)}


def test_panorama_conta_cafe_uma_vez(api: APIClient, com_total: Produto) -> None:
    corpo = get(api, "panorama")
    # igual ao cenário sem Total: soja 4200 + café 1500 (uma vez) + leite 300
    assert corpo["metricas"]["valor_total_real"] == 6000.0
    assert corpo["metricas"]["valor_lavouras_real"] == 5700.0
    assert corpo["metricas"]["area_colhida_ha"] == 3160.0
    slugs = [i["slug"] for i in corpo["series"]["composicao"]]
    assert COMPONENTE not in slugs and TOTAL in slugs
    assert corpo["series"]["composicao"][0]["participacao"] == 70.0
    assert COMPONENTE not in [i["slug"] for i in corpo["series"]["evolucao"]["itens"]]


def test_territorio_sem_cultura_nao_duplica(api: APIClient, com_total: Produto) -> None:
    corpo = get(api, "territorio")
    muns = {m["codigo_ibge"]: m for m in corpo["series"]["municipios"]}
    assert muns["1100023"]["valor"] == 3600.0
    assert muns["1100049"]["valor"] == 900.0  # Cacoal só tem café: 900, não 1800
    assert corpo["metricas"]["total"] == 5700.0
    dep = {d["codigo_ibge"]: d for d in corpo["series"]["dependentes"]}
    assert dep["1100049"]["participacao"] == 100.0  # não 50/50
    assert dep["1100049"]["cultura"] == "Café (em grão) Total"
    area = get(api, "territorio?metrica=area")
    assert area["metricas"]["total"] == 3160.0


def test_territorio_dominante_nao_divide_com_componente(api: APIClient, com_total: Produto) -> None:
    corpo = get(api, "territorio?metrica=dominante")
    cats = {m["codigo_ibge"]: m["categoria"] for m in corpo["series"]["municipios"]}
    assert cats["1100049"] == TOTAL
    assert [c["slug"] for c in corpo["series"]["categorias"]] == ["soja-em-grao", TOTAL]


def test_territorio_componente_explicito_continua_disponivel(
    api: APIClient, com_total: Produto
) -> None:
    corpo = get(api, f"territorio?cultura={COMPONENTE}")
    assert corpo["metricas"]["total"] == 1500.0
    assert {c["slug"] for c in corpo["filtros"]["opcoes"]["culturas"]} >= {COMPONENTE, TOTAL}


def test_crescimento_uma_linha_de_cafe_e_padrao_sem_duplicar(
    api: APIClient, com_total: Produto
) -> None:
    corpo = get(api, "crescimento")
    assert corpo["filtros"]["valores"]["cultura"] == "soja-em-grao"
    assert {i["slug"] for i in corpo["series"]["valor_por_hectare"]} == {"soja-em-grao", TOTAL}
    assert {c["slug"] for c in corpo["filtros"]["opcoes"]["culturas"]} >= {COMPONENTE, TOTAL}
    explicito = get(api, f"crescimento?cultura={COMPONENTE}")
    assert explicito["filtros"]["valores"]["cultura"] == COMPONENTE
