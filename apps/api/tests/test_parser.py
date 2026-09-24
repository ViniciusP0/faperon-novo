from decimal import Decimal

import pytest

from ingestao.parser import (
    interpretar_valor,
    limpar_nome_produto,
    nome_do_municipio,
    parsear_dados,
)
from tests.conftest import carregar_fixture


@pytest.mark.parametrize(
    ("token", "valor", "status"),
    [
        ("183546", Decimal(183546), "ok"),
        ("0", Decimal(0), "ok"),
        ("12.5", Decimal("12.5"), "ok"),
        ("X", None, "sigiloso"),
        ("x", None, "sigiloso"),
        ("-", None, "inexistente"),
        ("..", None, "inexistente"),
        ("...", None, "inexistente"),
        ("", None, "inexistente"),
        (None, None, "inexistente"),
        ("lixo", None, "inexistente"),
    ],
)
def test_interpretar_valor(token: str | None, valor: Decimal | None, status: str) -> None:
    assert interpretar_valor(token) == (valor, status)


def test_zero_real_nao_e_confundido_com_ausente() -> None:
    valor, status = interpretar_valor("0")
    assert status == "ok" and valor == 0


def test_nomes() -> None:
    assert nome_do_municipio("Alta Floresta D'Oeste - RO") == "Alta Floresta D'Oeste"
    assert limpar_nome_produto("Abacaxi*") == "Abacaxi"
    assert limpar_nome_produto("Soja (em grão)") == "Soja (em grão)"


def test_parsear_resposta_real_da_tabela_5457() -> None:
    resposta = carregar_fixture("sidra_5457_soja_quantidade_2023_2024.json")
    registros = list(parsear_dados(resposta))
    assert len(registros) == 52 * 2
    assert {r.municipio_codigo[:2] for r in registros} == {"11"}
    assert {r.variavel_codigo for r in registros} == {"214"}
    assert {r.unidade for r in registros} == {"Toneladas"}
    assert {r.categoria_codigo for r in registros} == {"40124"}
    assert {r.categoria_nome for r in registros} == {"Soja (em grão)"}
    corumbiara = next(r for r in registros if r.municipio_codigo == "1100072" and r.ano == 2024)
    assert corumbiara.valor == Decimal(183546)
    assert corumbiara.municipio_nome == "Corumbiara"
    ausentes = [r for r in registros if r.status == "inexistente"]
    assert ausentes and all(r.valor is None for r in ausentes)
