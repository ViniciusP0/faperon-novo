import pytest
from rest_framework.test import APIClient

from indicadores.aplicacao import atualizar_views
from indicadores.models import Indicador, Produto, ProdutoIndicador
from ingestao.models import Carga
from tests.conftest import lancar

pytestmark = pytest.mark.django_db

Q = "produto=soja-em-grao&indicador=quantidade-produzida"


def get(api: APIClient, caminho: str) -> tuple[int, dict | list]:
    resposta = api.get(f"/api/v1/{caminho}")
    return resposta.status_code, resposta.json()


@pytest.fixture
def milho_e_leite(dados_soja: Produto, carga: Carga) -> None:
    milho = Produto.objects.create(
        slug="milho-em-grao",
        codigo_ibge="40122",
        nome="Milho (em grão)",
        segmento="agricultura",
        tabela_origem=5457,
    )
    q = Indicador.objects.get(slug="quantidade-produzida")
    ProdutoIndicador.objects.create(produto=milho, indicador=q, unidade="Toneladas")
    lancar(milho, "quantidade-produzida", "1100015", 2024, 40, carga)
    lancar(milho, "quantidade-produzida", "1100023", 2024, 10, carga)
    leite = Produto.objects.create(
        slug="leite", codigo_ibge="2682", nome="Leite", segmento="pecuaria", tabela_origem=74
    )
    ProdutoIndicador.objects.create(
        produto=leite,
        indicador=Indicador.objects.get(slug="producao-de-origem-animal"),
        unidade="Mil litros",
    )
    ProdutoIndicador.objects.create(produto=leite, indicador=q, unidade="Mil litros")
    lancar(leite, "quantidade-produzida", "1100015", 2024, 5, carga)
    atualizar_views()


def test_saude(api: APIClient) -> None:
    assert get(api, "saude") == (200, {"status": "ok", "banco": "ok"})


def test_produtos_filtra_por_segmento_e_busca_sem_acento(
    api: APIClient, milho_e_leite: None
) -> None:
    _, todos = get(api, "produtos")
    assert [p["slug"] for p in todos] == ["leite", "milho-em-grao", "soja-em-grao"]
    _, agro = get(api, "produtos?segmento=agricultura")
    assert {p["segmento"] for p in agro} == {"agricultura"}
    _, busca = get(api, "produtos?q=GRAO")
    assert [p["slug"] for p in busca] == ["milho-em-grao", "soja-em-grao"]
    assert set(todos[0]) == {"slug", "nome", "segmento", "tabela_sidra"}
    assert get(api, "produtos?segmento=mineral")[0] == 400


def test_indicadores_do_produto_com_unidade(api: APIClient, dados_soja: Produto) -> None:
    status, corpo = get(api, "indicadores?produto=soja-em-grao")
    assert status == 200
    assert [i["slug"] for i in corpo] == [
        "area-colhida",
        "quantidade-produzida",
        "rendimento-medio",
    ]
    assert corpo[1] == {
        "slug": "quantidade-produzida",
        "nome": "Quantidade produzida",
        "unidade": "Toneladas",
        "agregacao": "soma",
    }
    assert corpo[2]["agregacao"] == "media_ponderada"
    assert get(api, "indicadores")[0] == 400
    assert get(api, "indicadores?produto=nao-existe")[0] == 404


def test_municipios(api: APIClient, dados_soja: Produto) -> None:
    _, corpo = get(api, "municipios")
    assert corpo[0] == {"codigo_ibge": "1100015", "nome": "Alta Floresta D'Oeste"}
    assert len(corpo) == 4


def test_ranking_ordem_sigiloso_e_percentual(api: APIClient, dados_soja: Produto) -> None:
    status, corpo = get(api, f"ranking?{Q}&inicio=2022&fim=2024")
    assert status == 200
    assert corpo["ano_referencia"] == 2024 and corpo["fim"] == 2024
    assert corpo["total_estadual"] == 600
    assert corpo["indicador"]["unidade"] == "Toneladas"
    itens = corpo["itens"]
    assert len(itens) == 4
    assert [
        (i["municipio"]["nome"], i["posicao"], i["valor"], i["status"], i["percentual_total"])
        for i in itens
    ] == [
        ("Ariquemes", 1, 450, "ok", 75.0),
        ("Alta Floresta D'Oeste", 2, 150, "ok", 25.0),
        ("Cabixi", None, None, "sigiloso", None),
        ("Cacoal", None, None, "inexistente", None),
    ]
    assert corpo["meta"]["tabela_sidra"] == 5457
    assert corpo["meta"]["atualizado_em"].endswith("Z")


def test_ranking_usa_sempre_o_ano_final(api: APIClient, dados_soja: Produto) -> None:
    _, corpo = get(api, f"ranking?{Q}&inicio=2022&fim=2023")
    assert corpo["ano_referencia"] == 2023
    assert corpo["total_estadual"] == 510
    assert corpo["itens"][0]["valor"] == 330


def test_periodo_padrao_e_ultimo_ano_com_dados(api: APIClient, dados_soja: Produto) -> None:
    _, corpo = get(api, f"ranking?{Q}")
    assert (corpo["inicio"], corpo["fim"]) == (2015, 2024)


def test_ranking_de_rendimento_usa_media_ponderada_e_sem_percentual(
    api: APIClient, dados_soja: Produto
) -> None:
    _, corpo = get(api, "ranking?produto=soja-em-grao&indicador=rendimento-medio&fim=2024")
    assert corpo["total_estadual"] == 3500
    assert all(i["percentual_total"] is None for i in corpo["itens"])
    assert corpo["itens"][0]["valor"] == 4000


def test_serie_total_de_ro(api: APIClient, dados_soja: Produto) -> None:
    status, corpo = get(api, f"serie?{Q}&inicio=2021&fim=2024")
    assert status == 200 and corpo["municipio"] is None
    assert [(p["ano"], p["valor"], p["status"]) for p in corpo["pontos"]] == [
        (2021, None, "inexistente"),
        (2022, 450, "ok"),
        (2023, 510, "ok"),
        (2024, 600, "ok"),
    ]


def test_serie_de_rendimento_nao_soma_municipios(api: APIClient, dados_soja: Produto) -> None:
    _, corpo = get(
        api, "serie?produto=soja-em-grao&indicador=rendimento-medio&inicio=2023&fim=2024"
    )
    assert [p["valor"] for p in corpo["pontos"]] == [None, 3500]


def test_serie_de_municipio_com_sigiloso(api: APIClient, dados_soja: Produto) -> None:
    _, corpo = get(api, f"serie?{Q}&inicio=2023&fim=2024&municipio=1100031")
    assert corpo["municipio"] == {"codigo_ibge": "1100031", "nome": "Cabixi"}
    assert [(p["valor"], p["status"]) for p in corpo["pontos"]] == [(60, "ok"), (None, "sigiloso")]
    assert get(api, f"serie?{Q}&municipio=9999999")[0] == 404


def test_comparacao_de_municipios(api: APIClient, dados_soja: Produto) -> None:
    status, corpo = get(api, f"comparacao?{Q}&inicio=2022&fim=2024&municipios=1100015,1100023")
    assert status == 200 and corpo["modo"] == "municipios"
    assert corpo["anos"] == [2022, 2023, 2024] and corpo["unidade"] == "Toneladas"
    assert [s["id"] for s in corpo["series"]] == ["1100015", "1100023"]
    assert [p["valor"] for p in corpo["series"][1]["pontos"]] == [300, 330, 450]


def test_comparacao_de_produtos_com_mesma_unidade(api: APIClient, milho_e_leite: None) -> None:
    status, corpo = get(
        api,
        "comparacao?produtos=soja-em-grao,milho-em-grao&indicador=quantidade-produzida&inicio=2024&fim=2024",
    )
    assert status == 200 and corpo["modo"] == "produtos"
    assert [(s["id"], s["pontos"][0]["valor"]) for s in corpo["series"]] == [
        ("soja-em-grao", 600),
        ("milho-em-grao", 50),
    ]


def test_comparacao_bloqueia_unidades_diferentes(api: APIClient, milho_e_leite: None) -> None:
    status, corpo = get(
        api, "comparacao?produtos=soja-em-grao,leite&indicador=quantidade-produzida&fim=2024"
    )
    assert status == 422
    assert "unidades diferentes" in corpo["erro"]
    assert set(corpo) == {"erro", "campos"}


@pytest.mark.parametrize(
    ("caminho", "esperado"),
    [
        (f"comparacao?{Q}&municipios=1100015", 400),  # só 1
        (f"comparacao?{Q}&municipios=1100015,1100023,1100031,1100049,1100056,1100064", 400),  # 6
        (f"comparacao?{Q}", 400),  # nem municipios nem produtos
        (f"comparacao?{Q}&municipios=1100015,1100023&produtos=a,b", 400),  # os dois
        (
            "comparacao?indicador=quantidade-produzida&municipios=1100015,1100023",
            400,
        ),  # sem produto
        (f"comparacao?{Q}&municipios=1100015,9999999", 404),
        (f"ranking?{Q}&inicio=2024&fim=2020", 400),
        (f"ranking?{Q}&inicio=abc", 400),
        ("ranking?produto=soja-em-grao", 400),
        ("ranking?produto=soja-em-grao&indicador=inexistente", 404),
        ("ranking?produto=nada&indicador=quantidade-produzida", 404),
    ],
)
def test_erros_no_formato_do_contrato(
    api: APIClient, dados_soja: Produto, caminho: str, esperado: int
) -> None:
    status, corpo = get(api, caminho)
    assert status == esperado
    assert set(corpo) == {"erro", "campos"}
    assert isinstance(corpo["campos"], dict) and corpo["erro"]


def test_meta_geral(api: APIClient, dados_soja: Produto) -> None:
    _, corpo = get(api, "meta")
    assert corpo["anos"] == {"min": 2022, "max": 2024}
    assert corpo["cargas"][0]["tabela"] == 5457
    assert corpo["ultima_carga"].endswith("Z")


def test_meta_sem_dados(api: APIClient, db: None) -> None:
    _, corpo = get(api, "meta")
    assert corpo["ultima_carga"] is None and corpo["cargas"] == []


def test_schema_openapi_documenta_todos_os_endpoints(api: APIClient) -> None:
    resposta = api.get("/api/schema/?format=json")
    assert resposta.status_code == 200
    caminhos = set(resposta.json()["paths"])
    esperados = {
        "/api/v1/produtos",
        "/api/v1/indicadores",
        "/api/v1/municipios",
        "/api/v1/meta",
        "/api/v1/ranking",
        "/api/v1/serie",
        "/api/v1/comparacao",
        "/api/v1/analise",
        "/api/v1/relatorio.pdf",
        "/api/v1/saude",
        "/api/v1/destaques",
    }
    assert esperados <= caminhos


def test_ranking_da_mv_confere_com_posicao_da_view(dados_soja: Produto) -> None:
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT municipio_id, posicao FROM mv_ranking WHERE ano = 2024 "
            "AND indicador_id = (SELECT id FROM dim_indicador WHERE slug = 'quantidade-produzida') "
            "ORDER BY posicao NULLS LAST, municipio_id"
        )
        assert cursor.fetchall() == [("1100023", 1), ("1100015", 2), ("1100031", None)]


def test_destaques_devolve_os_indicadores_da_home(api: APIClient, milho_e_leite: None) -> None:
    status, corpo = get(api, "destaques")
    assert status == 200
    assert [i["chave"] for i in corpo["itens"]] == ["soja", "milho"]  # sem dados = omitido

    soja = corpo["itens"][0]
    assert soja["rotulo"] == "Soja"
    assert soja["produto"]["slug"] == "soja-em-grao"
    assert soja["indicador"]["unidade"] == "Toneladas"
    assert soja["ano_referencia"] == 2024
    assert soja["total"] == 600.0
    assert [p["ano"] for p in soja["serie"]] == list(range(2015, 2025))
    assert soja["variacao_percentual"] == pytest.approx(33.33, abs=0.01)  # 450 (2022) -> 600
    assert [t["municipio"]["nome"] for t in soja["top"]] == ["Ariquemes", "Alta Floresta D'Oeste"]
    assert soja["top"][0]["percentual_total"] == 75.0
    assert soja["meta"]["tabela_sidra"] == 5457

    assert corpo["itens"][1]["variacao_percentual"] is None  # um único ano com dado
    assert corpo["meta"]["atualizado_em"] is not None


@pytest.mark.parametrize("extra", ["", "&inicio=2015"])
def test_recorte_sem_dados_responde_404_e_nao_inventa_periodo(
    api: APIClient, soja: Produto, extra: str
) -> None:
    status, corpo = get(api, f"ranking?{Q}{extra}")
    assert status == 404
    assert corpo["erro"] == "Não há dados publicados para este produto e indicador"
    assert corpo["campos"] == {}
