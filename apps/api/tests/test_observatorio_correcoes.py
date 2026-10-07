"""Correções da revisão final do Observatório (F1-F11)."""

import time
from decimal import Decimal as D

import pytest
from rest_framework.test import APIClient

from indicadores.models import IndicePreco, Produto
from ingestao.models import Carga
from tests.conftest import lancar

pytestmark = pytest.mark.django_db


def get(api: APIClient, caminho: str) -> tuple[int, dict]:
    resposta = api.get(f"/api/v1/observatorio/{caminho}")
    return resposta.status_code, resposta.json()


# F1 -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "qs",
    [
        "crescimento?inicio=1974&fim=2000000000",
        "crescimento?inicio=2000000000&fim=2000000000",
        "pecuaria?inicio=1974&fim=2000000000",
        "pecuaria?fim=2000000000",
        "panorama?ano=2000000000",
        "territorio?ano=2000000000",
    ],
)
def test_ano_gigante_e_400_e_rapido(api: APIClient, dados_observatorio: dict, qs: str) -> None:
    t0 = time.monotonic()
    status, corpo = get(api, qs)
    assert status == 400 and corpo["campos"]
    assert time.monotonic() - t0 < 2


def test_janela_fora_dos_dados_continua_200_com_serie_nula(
    api: APIClient, dados_observatorio: dict
) -> None:
    status, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=2090&fim=2100")
    assert status == 200
    assert corpo["metricas"]["variacao_producao_pct"] is None
    assert all(v is None for v in corpo["series"]["indices"]["producao"])
    status, corpo = get(api, "pecuaria?inicio=2090&fim=2100")
    assert status == 200
    assert all(p["valor"] is None for p in corpo["series"]["efetivo"])
    assert len(corpo["series"]["efetivo"]) <= 11


def test_janela_iterada_fica_dentro_dos_anos_com_dado(
    api: APIClient, dados_observatorio: dict
) -> None:
    # dados em 2015 e 2024: pedir 1980..2090 não gera 111 pontos
    _, corpo = get(api, "pecuaria?inicio=1980&fim=2090")
    assert [p["ano"] for p in corpo["series"]["efetivo"]][0] == 2015
    assert [p["ano"] for p in corpo["series"]["efetivo"]][-1] == 2024
    _, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=1980&fim=2090")
    assert corpo["series"]["indices"]["anos"][0] == 2015
    assert corpo["series"]["indices"]["anos"][-1] == 2024
