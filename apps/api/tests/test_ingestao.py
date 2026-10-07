import re
from typing import Any

import pytest
import requests
import responses

from indicadores.models import Indicador, Medicao, Produto, ProdutoIndicador
from ingestao.models import Carga, StagingMedicao
from ingestao.servico import CargaFalhou, executar_carga
from ingestao.sidra import BASE_URL, ErroSidra, SidraCliente
from ingestao.signals import carga_concluida
from tests.conftest import ClienteFalso, carregar_fixture

pytestmark = pytest.mark.django_db


def _estado() -> list[tuple[Any, ...]]:
    return list(
        Medicao.objects.order_by("municipio_id", "ano").values_list(
            "produto_id", "indicador_id", "municipio_id", "ano", "valor", "status_valor", "carga_id"
        )
    )


def test_carga_grava_dimensoes_e_fatos(cliente_soja: ClienteFalso) -> None:
    carga = executar_carga(5457, cliente_soja)
    assert carga.status == Carga.Status.SUCESSO
    assert carga.hash and carga.concluida_em
    produto = Produto.objects.get()
    assert (produto.slug, produto.nome, produto.segmento) == (
        "soja-em-grao",
        "Soja (em grão)",
        "agricultura",
    )
    vinculo = ProdutoIndicador.objects.get()
    assert vinculo.indicador.slug == "quantidade-produzida"
    assert vinculo.unidade == "Toneladas"
    assert Indicador.objects.count() == 8
    # 45 municípios com valor em 2024, 44 em 2023 (Cacaulândia só em 2024): ausentes não viram linha
    assert Medicao.objects.filter(ano=2024).count() == 45
    assert not Medicao.objects.filter(valor=0).exists()
    assert StagingMedicao.objects.count() == 0


def test_carga_e_idempotente_por_hash(cliente_soja: ClienteFalso) -> None:
    primeira = executar_carga(5457, cliente_soja)
    estado = _estado()
    segunda = executar_carga(5457, cliente_soja)
    assert segunda.status == Carga.Status.INALTERADA
    assert segunda.hash == primeira.hash
    assert _estado() == estado


def test_carga_forcada_repetida_produz_mesmo_estado(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    estado = _estado()
    forcada = executar_carga(5457, cliente_soja, forcar=True)
    assert forcada.status == Carga.Status.SUCESSO
    assert _estado() == estado  # nada mudou, inclusive carga_id das linhas
    assert Produto.objects.count() == 1


def test_dado_revisado_atualiza_valor(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    resposta = carregar_fixture("sidra_5457_soja_quantidade_2023_2024.json")
    for serie in resposta[0]["resultados"][0]["series"]:
        if serie["localidade"]["id"] == "1100072":
            serie["serie"]["2024"] = "190000"
    revisado = ClienteFalso([("40124", "Soja (em grão)")], {"40124": resposta})
    carga = executar_carga(5457, revisado)
    assert carga.status == Carga.Status.SUCESSO
    m = Medicao.objects.get(municipio_id="1100072", ano=2024)
    assert m.valor == 190000 and m.carga_id == carga.pk


def test_falha_preserva_dados_anteriores(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    estado = _estado()
    quebrado = ClienteFalso(
        [("40124", "Soja (em grão)")], {"40124": RuntimeError("IBGE fora do ar")}
    )
    with pytest.raises(CargaFalhou):
        executar_carga(5457, quebrado)
    falha = Carga.objects.filter(status=Carga.Status.FALHA).get()
    assert "IBGE fora do ar" in falha.erro
    assert _estado() == estado


def test_tabela_sem_medicoes_falha() -> None:
    vazio = ClienteFalso([("0", "Total")], {})
    with pytest.raises(CargaFalhou):
        executar_carga(5457, vazio)


def _resposta(
    variavel: str, unidade: str, categoria: tuple[str, str], serie: dict[str, str]
) -> Any:
    return {
        "id": variavel,
        "variavel": "x",
        "unidade": unidade,
        "resultados": [
            {
                "classificacoes": [
                    {"id": "80", "nome": "c", "categoria": {categoria[0]: categoria[1]}}
                ],
                "series": [
                    {
                        "localidade": {"id": "1100015", "nome": "Alta Floresta D'Oeste - RO"},
                        "serie": serie,
                    }
                ],
            }
        ],
    }


def test_valor_da_producao_so_de_1994_em_mil_reais_e_sigiloso_explicito() -> None:
    resposta = [
        _resposta(
            "215",
            "Mil Cruzeiros [1974 a 1985] ... Mil Reais [1994 a 2024]",
            ("2682", "Leite"),
            {"1993": "500", "1994": "600", "1995": "X", "1996": "-"},
        ),
        _resposta("106", "Mil litros", ("2682", "Leite"), {"2000": "1000"}),
    ]
    cliente = ClienteFalso([("2682", "Leite")], {"2682": resposta})
    executar_carga(74, cliente)
    valor = ProdutoIndicador.objects.get(indicador__slug="valor-da-producao")
    assert valor.unidade == "Mil Reais"
    anos = dict(
        Medicao.objects.filter(indicador__slug="valor-da-producao").values_list(
            "ano", "status_valor"
        )
    )
    assert anos == {1994: "ok", 1995: "sigiloso"}
    sigiloso = Medicao.objects.get(ano=1995)
    assert sigiloso.valor is None
    leite = ProdutoIndicador.objects.get(indicador__slug="producao-de-origem-animal")
    assert leite.unidade == "Mil litros"
    assert Produto.objects.get().segmento == "pecuaria"


def test_slug_de_produto_colidente_recebe_sufixo_da_tabela() -> None:
    a = ClienteFalso(
        [("1", "Bovino")], {"1": [_resposta("105", "Cabeças", ("1", "Bovino"), {"2020": "10"})]}
    )
    b = ClienteFalso(
        [("2", "Bovino")], {"2": [_resposta("106", "Mil litros", ("2", "Bovino"), {"2020": "10"})]}
    )
    executar_carga(3939, a)
    executar_carga(74, b)
    assert sorted(Produto.objects.values_list("slug", flat=True)) == ["bovino", "bovino-74"]


# --- cliente HTTP ---------------------------------------------------------


def _cliente_http(tentativas: int = 3) -> tuple[SidraCliente, list[float]]:
    esperas: list[float] = []
    return SidraCliente(tentativas=tentativas, espera_base=1.0, dormir=esperas.append), esperas


@responses.activate
def test_cliente_repete_com_backoff_em_5xx() -> None:
    url = f"{BASE_URL}/5457/metadados"
    responses.add(responses.GET, url, status=503)
    responses.add(responses.GET, url, status=429)
    responses.add(responses.GET, url, json=carregar_fixture("sidra_meta_5457.json"))
    cliente, esperas = _cliente_http()
    categorias = cliente.categorias(5457, 782)
    assert ("40124", "Soja (em grão)") in categorias
    assert esperas == [1.0, 2.0]


@responses.activate
def test_cliente_desiste_apos_tentativas() -> None:
    url = f"{BASE_URL}/5457/metadados"
    responses.add(responses.GET, url, body=requests.ConnectionError("sem rede"))
    cliente, esperas = _cliente_http(tentativas=2)
    with pytest.raises(ErroSidra, match="após 2 tentativas"):
        cliente.categorias(5457, 782)
    assert len(esperas) == 1


@responses.activate
def test_cliente_nao_repete_erro_4xx() -> None:
    responses.add(responses.GET, f"{BASE_URL}/5457/metadados", status=404)
    cliente, esperas = _cliente_http()
    with pytest.raises(ErroSidra, match="HTTP 404"):
        cliente.categorias(5457, 782)
    assert esperas == [] and len(responses.calls) == 1


@responses.activate
def test_cliente_monta_url_de_dados_por_produto() -> None:
    responses.add(responses.GET, url=re.compile(r".*/5457/periodos/all/.*"), json=[])
    cliente, _ = _cliente_http()
    cliente.dados(5457, ("8331", "214"), 782, "40124")
    chamada = responses.calls[0].request.url
    assert chamada is not None
    assert "variaveis/8331%7C214" in chamada or "variaveis/8331|214" in chamada
    assert "N6" in chamada and "782" in chamada and "40124" in chamada


@responses.activate
def test_cliente_classificacao_inexistente() -> None:
    responses.add(
        responses.GET, f"{BASE_URL}/5457/metadados", json=carregar_fixture("sidra_meta_5457.json")
    )
    cliente, _ = _cliente_http()
    with pytest.raises(ErroSidra, match="Classificação 999"):
        cliente.categorias(5457, 999)


def test_falha_no_refresh_desfaz_a_promocao_e_marca_falha(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    estado = _estado()
    resposta = carregar_fixture("sidra_5457_soja_quantidade_2023_2024.json")
    for serie in resposta[0]["resultados"][0]["series"]:
        if serie["localidade"]["id"] == "1100072":
            serie["serie"]["2024"] = "190000"
    revisado = ClienteFalso([("40124", "Soja (em grão)")], {"40124": resposta})

    def quebra(**_: object) -> None:
        raise RuntimeError("refresh travou")

    carga_concluida.connect(quebra, dispatch_uid="teste.quebra")
    try:
        with pytest.raises(CargaFalhou):
            executar_carga(5457, revisado)
    finally:
        carga_concluida.disconnect(dispatch_uid="teste.quebra")
    ultima = Carga.objects.order_by("-id").first()
    assert ultima is not None and ultima.status == Carga.Status.FALHA
    assert "refresh travou" in ultima.erro
    assert _estado() == estado
