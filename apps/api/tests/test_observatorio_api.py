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


def get(api: APIClient, caminho: str) -> tuple[int, dict]:
    resposta = api.get(f"/api/v1/observatorio/{caminho}")
    return resposta.status_code, resposta.json()


def test_panorama_padrao(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "panorama")
    assert status == 200
    assert corpo["filtros"]["valores"] == {"ano": 2024, "janela": 10, "inicio": 2015}
    # 2024: soja 4200 + café 1500 + leite 300 = 6000 (preços de 2024)
    assert corpo["metricas"]["valor_total_real"] == 6000.0
    assert corpo["metricas"]["valor_origem_animal_real"] == 300.0
    # 2015 deflacionado: (400+200+100) * 6000/4000 = 1050 → variação real 471,43%
    assert corpo["metricas"]["variacao_real_pct"] == pytest.approx(471.43, abs=0.01)
    assert corpo["series"]["composicao"][0]["slug"] == "soja-em-grao"
    assert corpo["series"]["composicao"][0]["participacao"] == 70.0
    assert corpo["series"]["evolucao"]["anos"] == list(range(2015, 2025))
    assert corpo["texto"]["manchete"].startswith("Em 2024, Soja (em grão) respondeu por 70,0%")
    assert "não inclui carne bovina" in " ".join(corpo["qualidade"]["avisos"])
    assert corpo["qualidade"]["municipios_sigilosos"] == 1
    assert corpo["qualidade"]["ano_ref_monetario"] == 2024
    assert [f["tabela_sidra"] for f in corpo["meta"]["fontes"]] == [5457, 74, 1737]


def test_panorama_recorta_inicio_antes_de_1995(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "panorama?ano=1996&janela=5")
    assert status == 200
    assert corpo["filtros"]["valores"]["inicio"] == 1995
    assert any("1995" in a for a in corpo["qualidade"]["avisos"])
    # 1995 não tem dados: sem base de comparação, a variação é None e não há erro
    assert corpo["metricas"]["variacao_real_pct"] is None
    assert corpo["metricas"]["valor_total_real"] == 500.0


@pytest.mark.parametrize("qs", ["janela=7", "ano=abc", "ano=1990"])
def test_panorama_parametros_invalidos(api: APIClient, dados_observatorio: dict, qs: str) -> None:
    status, corpo = get(api, f"panorama?{qs}")
    assert status == 400 and corpo["campos"]


def test_panorama_sem_dados(api: APIClient, db: None) -> None:
    status, corpo = get(api, "panorama")
    assert status == 200
    assert corpo["series"].get("composicao", []) == []
    assert corpo["texto"]["manchete"] == "Não há dados publicados pelo IBGE para este recorte."
