from decimal import Decimal as D

import pytest
from rest_framework.test import APIClient

from observatorio.servico import referencia_monetaria

pytestmark = pytest.mark.django_db


def test_referencia_monetaria() -> None:
    indices = {2024: D(1), 2025: D(2)}
    assert referencia_monetaria(2024, indices) == (2024, [])
    ano, avisos = referencia_monetaria(2026, indices)
    assert ano == 2025 and avisos == [
        "O IPCA de 2026 ainda não está fechado; os valores estão a preços de 2025."
    ]
    assert referencia_monetaria(2024, {}) == (None, [])


def test_rotas_existem_no_schema(api: APIClient) -> None:
    schema = api.get("/api/schema/").content.decode()
    for bloco in ("panorama", "crescimento", "territorio", "pecuaria"):
        assert f"/api/v1/observatorio/{bloco}" in schema
