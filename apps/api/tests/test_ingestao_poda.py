"""A2: numa carga completa, o que a fonte deixou de publicar sai do fato (com salvaguarda de 90%)."""

import logging
from typing import Any

import pytest

from indicadores.aplicacao import garantir_indicadores
from indicadores.models import Indicador, Medicao, Municipio, Produto
from ingestao.models import Carga
from ingestao.servico import executar_carga
from tests.conftest import ClienteFalso, carregar_fixture

pytestmark = pytest.mark.django_db

ARQUIVO = "sidra_5457_soja_quantidade_2023_2024.json"
ARACAJU_FAKE = "1100072"  # município da fixture com valor em 2023 e 2024


def _series(resposta: Any) -> list[dict[str, Any]]:
    return list(resposta[0]["resultados"][0]["series"])


def _cliente(resposta: Any) -> ClienteFalso:
    return ClienteFalso([("40124", "Soja (em grão)")], {"40124": resposta})


def _chaves() -> set[tuple[str, int]]:
    return set(Medicao.objects.values_list("municipio_id", "ano"))


def test_valor_revisado_para_traco_deixa_de_aparecer(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    assert Medicao.objects.count() == 89
    assert Medicao.objects.filter(municipio_id=ARACAJU_FAKE, ano=2024).exists()

    resposta = carregar_fixture(ARQUIVO)
    for serie in _series(resposta):
        if serie["localidade"]["id"] == ARACAJU_FAKE:
            serie["serie"]["2024"] = "-"
    carga = executar_carga(5457, _cliente(resposta))

    assert carga.status == Carga.Status.SUCESSO
    assert Medicao.objects.count() == 88
    assert not Medicao.objects.filter(municipio_id=ARACAJU_FAKE, ano=2024).exists()
    assert Medicao.objects.filter(municipio_id=ARACAJU_FAKE, ano=2023).exists()


def test_valor_que_virou_sigiloso_continua_como_sigiloso(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    resposta = carregar_fixture(ARQUIVO)
    for serie in _series(resposta):
        if serie["localidade"]["id"] == ARACAJU_FAKE:
            serie["serie"]["2024"] = "X"
    executar_carga(5457, _cliente(resposta))
    m = Medicao.objects.get(municipio_id=ARACAJU_FAKE, ano=2024)
    assert (m.valor, m.status_valor) == (None, "sigiloso")
    assert Medicao.objects.count() == 89


def test_staging_abaixo_de_90_por_cento_nao_apaga_nada(
    cliente_soja: ClienteFalso, caplog: pytest.LogCaptureFixture
) -> None:
    executar_carga(5457, cliente_soja)
    antes = _chaves()
    assert len(antes) == 89

    resposta = carregar_fixture(ARQUIVO)
    resposta[0]["resultados"][0]["series"] = _series(resposta)[:20]  # a fonte "sumiu" com a maioria
    with caplog.at_level(logging.WARNING):
        carga = executar_carga(5457, _cliente(resposta))

    assert carga.status == Carga.Status.SUCESSO  # a carga não falha
    assert _chaves() == antes
    avisos = [r.getMessage() for r in caplog.records if r.levelno == logging.WARNING]
    assert any("tabela 5457" in a and "89" in a and "não apagou" in a for a in avisos), avisos


@pytest.mark.parametrize(("sumiram", "restam"), [(8, 81), (9, 89)])
def test_limite_de_90_por_cento(cliente_soja: ClienteFalso, sumiram: int, restam: int) -> None:
    """89 linhas existentes: 81 no staging (91%) poda; 80 (89,9%) não poda e as 89 seguem."""
    executar_carga(5457, cliente_soja)
    resposta = carregar_fixture(ARQUIVO)
    removidas = 0
    for serie in _series(resposta):
        for ano in ("2023", "2024"):
            if removidas < sumiram and ano in serie["serie"]:
                serie["serie"][ano] = "-"
                removidas += 1
    executar_carga(5457, _cliente(resposta))
    assert Medicao.objects.count() == restam


def test_carga_parcial_nunca_apaga(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    resposta = carregar_fixture(ARQUIVO)
    for serie in _series(resposta):
        if serie["localidade"]["id"] == ARACAJU_FAKE:
            serie["serie"]["2024"] = "-"
    carga = executar_carga(5457, _cliente(resposta), apenas={"40124"})
    assert carga.status == Carga.Status.SUCESSO
    assert Medicao.objects.count() == 89
    assert Medicao.objects.filter(municipio_id=ARACAJU_FAKE, ano=2024).exists()


def test_dados_de_outras_tabelas_nunca_sao_tocados(cliente_soja: ClienteFalso) -> None:
    garantir_indicadores()
    bovino = Produto.objects.create(
        slug="bovino", codigo_ibge="2670", nome="Bovino", segmento="pecuaria", tabela_origem=3939
    )
    Municipio.objects.create(codigo_ibge=ARACAJU_FAKE, nome="X")
    carga_pecuaria = Carga.objects.create(
        tabela=3939, iniciada_em="2026-01-01T00:00:00Z", status=Carga.Status.SUCESSO
    )
    Medicao.objects.create(
        produto=bovino,
        indicador=Indicador.objects.get(slug="efetivo"),
        municipio_id=ARACAJU_FAKE,
        ano=2024,
        valor=1000,
        status_valor="ok",
        carga=carga_pecuaria,
    )
    executar_carga(5457, cliente_soja)
    assert Medicao.objects.filter(produto=bovino).count() == 1
    assert Medicao.objects.filter(produto__tabela_origem=5457).count() == 89
    resposta = carregar_fixture(ARQUIVO)
    for serie in _series(resposta):
        if serie["localidade"]["id"] == ARACAJU_FAKE:
            serie["serie"]["2024"] = "-"
    executar_carga(5457, _cliente(resposta))
    assert Medicao.objects.filter(produto__tabela_origem=5457).count() == 88  # a poda agiu na 5457
    assert Medicao.objects.filter(produto=bovino).count() == 1  # e só nela


def test_poda_e_idempotente(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    resposta = carregar_fixture(ARQUIVO)
    for serie in _series(resposta):
        if serie["localidade"]["id"] == ARACAJU_FAKE:
            serie["serie"]["2024"] = "-"
    executar_carga(5457, _cliente(resposta))
    estado = sorted(Medicao.objects.values_list("municipio_id", "ano", "valor", "carga_id"))
    segunda = executar_carga(5457, _cliente(resposta))
    assert segunda.status == Carga.Status.INALTERADA
    forcada = executar_carga(5457, _cliente(resposta), forcar=True)
    assert forcada.status == Carga.Status.SUCESSO
    assert sorted(Medicao.objects.values_list("municipio_id", "ano", "valor", "carga_id")) == estado
    assert len(estado) == 88
