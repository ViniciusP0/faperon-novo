import math
from decimal import Decimal as D

import pytest
from rest_framework.test import APIClient

from indicadores.models import IndicePreco, Produto
from ingestao.models import Carga
from observatorio import regras as r
from observatorio.servico import referencia_monetaria
from tests.conftest import lancar

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


def test_panorama_area_colhida_do_ano(api: APIClient, dados_observatorio: dict) -> None:
    # 2024, PAM: soja 110 (Alta Floresta) + 1000 (Ariquemes) + café 50 + 2000 (Cacoal)
    _, corpo = get(api, "panorama")
    assert corpo["metricas"]["area_colhida_ha"] == 3160.0


def _extras_pam(carga: Carga) -> None:
    """7 extras na 5457: com os 3 do fixture são 10 itens e o 'demais' agrupa os 2 menores."""
    valores = {"e1": 100, "e2": 90, "e3": 80, "e4": 70, "e5": 60, "e6": 50, "e7": 40}
    for slug, valor in valores.items():
        p = Produto.objects.create(
            slug=slug,
            codigo_ibge=slug,
            nome=slug.upper(),
            segmento="agricultura",
            tabela_origem=5457,
        )
        lancar(p, "valor-da-producao", "1100015", 2024, valor, carga)
        if slug == "e7":  # único item do 'demais' com dado em 2015 (4000 → 6000: x1,5)
            lancar(p, "valor-da-producao", "1100015", 2015, 20, carga)


def test_panorama_demais_nao_vira_zero(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    _extras_pam(carga)
    _, corpo = get(api, "panorama")
    comp = corpo["series"]["composicao"]
    assert len(comp) == 9
    assert comp[-1]["slug"] == "demais" and comp[-1]["valor"] == 90.0
    assert abs(sum(i["participacao"] for i in comp) - 100) <= 0.1
    demais = next(i for i in corpo["series"]["evolucao"]["itens"] if i["slug"] == "demais")
    assert demais["valores"][0] == 30.0  # 2015: 20 * 6000/4000
    assert demais["valores"][1:9] == [None] * 8  # 2016-2023 sem dado: nunca zero
    assert demais["valores"][9] == 90.0


def test_panorama_sem_ipca(api: APIClient, dados_observatorio: dict) -> None:

    IndicePreco.objects.all().delete()
    status, corpo = get(api, "panorama")
    assert status == 200
    assert corpo["texto"]["manchete"] == r.AVISO_SEM_IPCA
    assert corpo["qualidade"]["avisos"] == [r.AVISO_SEM_IPCA]
    assert corpo["qualidade"]["ano_ref_monetario"] is None
    assert corpo["series"].get("composicao", []) == []


def test_panorama_ano_com_ipca_nao_fechado(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:

    lancar(dados_observatorio["soja"], "valor-da-producao", "1100015", 2026, 700, carga)
    status, corpo = get(api, "panorama?ano=2026")
    assert status == 200
    assert corpo["qualidade"]["ano_ref_monetario"] == 2025
    assert r.aviso_ano_ref(2026, 2025) in corpo["qualidade"]["avisos"]
    assert r.AVISO_SEM_IPCA in corpo["qualidade"]["avisos"]
    assert corpo["filtros"]["valores"]["ano"] == 2026


def test_crescimento_padrao_e_decomposicao(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "crescimento")
    assert status == 200
    assert corpo["filtros"]["valores"] == {"cultura": "soja-em-grao", "inicio": 2015, "fim": 2024}
    m = corpo["metricas"]
    # soja: área 100→1110, produção 300→3660
    assert m["parte_area_pct"] + m["parte_rendimento_pct"] == pytest.approx(100, abs=0.01)
    assert m["perda_ultimo_ano_pct"] == pytest.approx((1120 - 1110) / 1120 * 100, abs=0.01)
    ind = corpo["series"]["indices"]
    assert ind["producao"][0] == 100.0 and ind["area"][0] == 100.0
    assert ind["producao"][-1] == pytest.approx(3660 / 300 * 100, abs=0.01)
    # rendimento = produção ÷ área estadual (3,0 → 3,2973), nunca média de rendimentos
    assert ind["rendimento"][-1] == pytest.approx((3660 / 1110) / 3 * 100, abs=0.01)
    assert {i["slug"] for i in corpo["series"]["valor_por_hectare"]} == {
        "soja-em-grao",
        "cafe-em-grao-canephora",
    }


def test_crescimento_ranking_exige_area_minima(
    api: APIClient, dados_observatorio: dict
) -> None:
    # em 2015 nenhuma cultura tem 1.000 ha colhidos
    _, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=2010&fim=2015")
    assert corpo["series"]["valor_por_hectare"] == []


def test_crescimento_sem_base_no_inicio(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "crescimento?cultura=soja-em-grao&inicio=2016&fim=2024")
    assert status == 200
    assert corpo["metricas"]["parte_area_pct"] is None
    assert corpo["texto"]["manchete"].startswith("Não há base de comparação")
    assert corpo["series"]["indices"]["producao"] == [None] * 9


def test_crescimento_erros(api: APIClient, dados_observatorio: dict) -> None:
    assert get(api, "crescimento?cultura=inexistente")[0] == 404
    assert get(api, "crescimento?inicio=2024&fim=2015")[0] == 400


def test_crescimento_sem_ipca(api: APIClient, dados_observatorio: dict) -> None:
    IndicePreco.objects.all().delete()
    status, corpo = get(api, "crescimento")
    assert status == 200
    m = corpo["metricas"]
    ln_p, ln_a = math.log(3660 / 300), math.log(1110 / 100)
    assert m["variacao_producao_pct"] == pytest.approx(1120.0, abs=0.01)
    assert m["parte_area_pct"] == pytest.approx(ln_a / ln_p * 100, abs=0.01)
    assert m["parte_rendimento_pct"] == pytest.approx(100 - ln_a / ln_p * 100, abs=0.01)
    p15, p24 = (110 - 100) / 110 * 100, (1120 - 1110) / 1120 * 100
    assert m["perda_ultimo_ano_pct"] == pytest.approx(p24, abs=0.01)
    assert m["perda_media_pct"] == pytest.approx((p15 + p24) / 2, abs=0.01)
    assert corpo["series"]["indices"]["producao"][0] == 100.0
    assert len(corpo["series"]["perda"]) == 10
    assert corpo["series"]["valor_por_hectare"] == []
    assert corpo["qualidade"]["ano_ref_monetario"] is None
    assert r.AVISO_SEM_IPCA in corpo["qualidade"]["avisos"]
    assert corpo["texto"]["manchete"].startswith("A produção de Soja (em grão) cresceu")
    assert corpo["texto"]["como_ler"] == r.como_ler("crescimento", None)


def _perda(corpo: dict) -> dict[int, float | None]:
    return {i["ano"]: i["valor"] for i in corpo["series"]["perda"]}


def test_crescimento_perda_so_com_municipios_em_comum(
    api: APIClient, dados_observatorio: dict
) -> None:
    # café 2024: cac tem área colhida 2000 sem plantada; só ari (50/50) conta
    _, corpo = get(api, "crescimento?cultura=cafe-em-grao-canephora")
    perda = _perda(corpo)
    assert perda[2024] == 0.0
    assert perda[2015] == 0.0
    assert corpo["metricas"]["perda_ultimo_ano_pct"] == 0.0
    # soja 2024: af e ari têm os dois valores
    _, corpo = get(api, "crescimento?cultura=soja-em-grao")
    assert _perda(corpo)[2024] == pytest.approx((1120 - 1110) / 1120 * 100, abs=0.01)


def test_crescimento_perda_sem_municipio_em_comum(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    soja = dados_observatorio["soja"]
    lancar(soja, "area-plantada", "1100015", 2020, 100, carga)
    lancar(soja, "area-colhida", "1100023", 2020, 90, carga)
    _, corpo = get(api, "crescimento?cultura=soja-em-grao")
    assert _perda(corpo)[2020] is None
