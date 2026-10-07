import math
from decimal import Decimal as D

import pytest
from rest_framework.test import APIClient

from indicadores.models import IndicePreco, Medicao, Produto
from ingestao.models import Carga
from observatorio import regras as r
from observatorio.servico import referencia_monetaria
from tests.conftest import lancar

pytestmark = pytest.mark.django_db

AVISO_BASE_1_1 = (
    "A variação do rebanho foi calculada sobre o 1 município com dado nos dois anos; "
    "1 município ficou de fora."
)


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


def test_territorio_valor(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "territorio")
    assert status == 200
    assert corpo["filtros"]["valores"] == {"metrica": "valor", "cultura": None, "ano": 2024}
    muns = {m["codigo_ibge"]: m for m in corpo["series"]["municipios"]}
    assert len(muns) == 4
    assert muns["1100031"]["status"] == "sigiloso" and muns["1100031"]["valor"] is None
    assert muns["1100023"]["valor"] == 3600.0
    assert {m["nome"]: m["valor"] for m in corpo["series"]["microrregioes"]} == {
        "Cacoal": 4800.0,
        "Vilhena": 900.0,
    }
    assert corpo["metricas"]["top5_pct"] == 100.0
    assert corpo["qualidade"]["municipios_sigilosos"] == 1
    # Alta Floresta: só soja (100%); Cacoal: só café (100%); Ariquemes: soja 83%
    assert {d["codigo_ibge"] for d in corpo["series"]["dependentes"]} == {
        "1100015",
        "1100023",
        "1100049",
    }


def test_territorio_dominante_e_rebanho(api: APIClient, dados_observatorio: dict) -> None:
    _, dom = get(api, "territorio?metrica=dominante")
    cats = {m["codigo_ibge"]: m["categoria"] for m in dom["series"]["municipios"]}
    assert cats["1100023"] == "soja-em-grao" and cats["1100049"] == "cafe-em-grao-canephora"
    assert cats["1100031"] is None
    _, reb = get(api, "territorio?metrica=rebanho")
    assert reb["metricas"]["unidade"] == "Cabeças"
    assert reb["filtros"]["valores"]["cultura"] is None


def test_territorio_metrica_invalida(api: APIClient, dados_observatorio: dict) -> None:
    assert get(api, "territorio?metrica=chuva")[0] == 400
    assert get(api, "territorio?cultura=inexistente")[0] == 404


def test_territorio_ano_indisponivel_para_a_metrica(
    api: APIClient, dados_observatorio: dict
) -> None:
    assert get(api, "territorio?ano=2010")[0] == 400
    # 1996 existe para valor, mas não para o efetivo bovino
    assert get(api, "territorio?metrica=rebanho&ano=1996")[0] == 400


def test_territorio_rebanho_ignora_cultura(api: APIClient, dados_observatorio: dict) -> None:
    _, corpo = get(api, "territorio?metrica=rebanho&cultura=soja-em-grao")
    assert corpo["filtros"]["valores"]["cultura"] is None
    muns = {m["codigo_ibge"]: m for m in corpo["series"]["municipios"]}
    assert muns["1100015"]["valor"] == 1500.0 and muns["1100023"]["valor"] == 500.0
    assert muns["1100049"]["status"] == "sem_dado" and muns["1100049"]["valor"] is None
    assert corpo["metricas"]["total"] == 2000.0


def test_territorio_valor_por_cultura_marca_sigiloso_e_sem_dado(
    api: APIClient, dados_observatorio: dict
) -> None:
    _, soja = get(api, "territorio?cultura=soja-em-grao")
    assert soja["metricas"]["total"] == 4200.0
    ms = {m["codigo_ibge"]: m["status"] for m in soja["series"]["municipios"]}
    assert ms == {"1100015": "ok", "1100023": "ok", "1100031": "sigiloso", "1100049": "sem_dado"}
    _, cafe = get(api, "territorio?cultura=cafe-em-grao-canephora")
    cs = {m["codigo_ibge"]: m["status"] for m in cafe["series"]["municipios"]}
    assert cs["1100031"] == "sem_dado" and cafe["qualidade"]["municipios_sigilosos"] == 0


def test_territorio_area_sem_ipca_funciona(api: APIClient, dados_observatorio: dict) -> None:
    IndicePreco.objects.all().delete()
    status, corpo = get(api, "territorio?metrica=area")
    assert status == 200
    muns = {m["codigo_ibge"]: m["valor"] for m in corpo["series"]["municipios"]}
    assert muns == {"1100015": 110.0, "1100023": 1050.0, "1100031": None, "1100049": 2000.0}
    assert corpo["metricas"]["total"] == 3160.0
    assert corpo["qualidade"]["ano_ref_monetario"] is None
    assert r.AVISO_SEM_IPCA not in corpo["qualidade"]["avisos"]
    assert len(corpo["series"]["dependentes"]) == 3


def test_territorio_valor_sem_ipca_bloco_vazio(api: APIClient, dados_observatorio: dict) -> None:
    IndicePreco.objects.all().delete()
    status, corpo = get(api, "territorio")
    assert status == 200
    assert corpo["series"].get("municipios", []) == []
    assert r.AVISO_SEM_IPCA in corpo["qualidade"]["avisos"]


def test_territorio_dominante_sem_ipca_mantem_categorias_e_dependentes(
    api: APIClient, dados_observatorio: dict
) -> None:
    IndicePreco.objects.all().delete()
    status, corpo = get(api, "territorio?metrica=dominante")
    assert status == 200
    cats = {m["codigo_ibge"]: m["categoria"] for m in corpo["series"]["municipios"]}
    assert cats == {
        "1100015": "soja-em-grao",
        "1100023": "soja-em-grao",
        "1100031": None,
        "1100049": "cafe-em-grao-canephora",
    }
    assert [c["slug"] for c in corpo["series"]["categorias"]] == [
        "soja-em-grao",
        "cafe-em-grao-canephora",
    ]
    assert len(corpo["series"]["dependentes"]) == 3
    assert corpo["metricas"]["total"] is None
    assert r.AVISO_SEM_IPCA in corpo["qualidade"]["avisos"]


def test_territorio_dominante_agrupa_em_outras_e_desempata_por_slug(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    # 9 culturas extras, cada uma dominante em um município novo (empate 1 a 1 -> ordem do slug)
    from indicadores.models import Indicador, Municipio, ProdutoIndicador

    ind = Indicador.objects.get(slug="valor-da-producao")
    for i in range(9):
        p = Produto.objects.create(
            slug=f"cultura-{i}",
            codigo_ibge=f"9{i}",
            nome=f"Cultura {i}",
            segmento="agricultura",
            tabela_origem=5457,
        )
        ProdutoIndicador.objects.create(produto=p, indicador=ind, unidade="Mil Reais")
        cod = f"11001{i}0"
        Municipio.objects.create(codigo_ibge=cod, nome=f"Mun {i}")
        lancar(p, "valor-da-producao", cod, 2024, 10 + i, carga)
    _, corpo = get(api, "territorio?metrica=dominante")
    slugs = [c["slug"] for c in corpo["series"]["categorias"]]
    assert len(slugs) == 9 and slugs[-1] == "outras"
    assert slugs[:2] == ["soja-em-grao", "cafe-em-grao-canephora"]
    assert slugs[2:8] == [f"cultura-{i}" for i in range(6)]
    cats = {m["nome"]: m["categoria"] for m in corpo["series"]["municipios"]}
    assert cats["Mun 8"] == "outras" and cats["Mun 0"] == "cultura-0"


def test_territorio_sigilo_parcial_nao_distorce_dominante_nem_dependentes(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    # 1100049 tem café OK, mas passa a ter soja sigilosa no mesmo ano
    lancar(dados_observatorio["soja"], "valor-da-producao", "1100049", 2024, None, carga, "sigiloso")
    _, dom = get(api, "territorio?metrica=dominante")
    cats = {m["codigo_ibge"]: m["categoria"] for m in dom["series"]["municipios"]}
    assert cats["1100049"] is None and cats["1100031"] is None
    assert cats["1100023"] == "soja-em-grao" and cats["1100015"] == "soja-em-grao"
    assert {d["codigo_ibge"] for d in dom["series"]["dependentes"]} == {"1100015", "1100023"}
    assert r.aviso_sigilo_parcial(2) in dom["qualidade"]["avisos"]
    _, val = get(api, "territorio")
    assert "1100049" not in {d["codigo_ibge"] for d in val["series"]["dependentes"]}
    assert r.aviso_sigilo_parcial(2) in val["qualidade"]["avisos"]


def test_territorio_aviso_sigilo_parcial_so_com_sigilo(
    api: APIClient, dados_observatorio: dict
) -> None:
    _, corpo = get(api, "territorio")
    assert corpo["qualidade"]["avisos"] == [r.aviso_sigilo_parcial(1)]
    Medicao.objects.filter(status_valor="sigiloso").delete()
    _, limpo = get(api, "territorio")
    assert limpo["qualidade"]["avisos"] == []


def test_pecuaria_padrao(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "pecuaria")
    assert status == 200
    assert corpo["filtros"]["valores"] == {"rebanho": "bovino", "inicio": 2015, "fim": 2024}
    m = corpo["metricas"]
    assert m["efetivo_final"] == 2000.0 and m["variacao_pct"] == 50.0
    # leite 2015: 1000 mil L / 1000 vacas = 1000 L; 2024: 2000/800 = 2500 L → +150%
    assert m["leite"]["produtividade_l_vaca"] == 2500.0
    assert m["leite"]["variacao_produtividade_pct"] == 150.0
    assert m["leite"]["valor_real"] == 300.0
    assert m["leite"]["volume_mil_litros"] == 2000.0
    assert m["top5_pct"] == 100.0
    assert corpo["series"]["leite_polos"][0]["codigo_ibge"] == "1100015"
    assert corpo["series"]["leite_polos"][0]["produtividade"] == 2500.0
    assert corpo["texto"]["manchete"].startswith("O rebanho bovino cresceu 50,0%")
    assert corpo["qualidade"]["municipios_sigilosos"] == 0
    efetivo = corpo["series"]["efetivo"]
    assert len(efetivo) == 10 and efetivo[0] == {"ano": 2015, "valor": 1000.0}
    assert efetivo[-1] == {"ano": 2024, "valor": 2000.0} and efetivo[1]["valor"] is None
    assert [(i["slug"], i["valor"], i["participacao"]) for i in corpo["series"]["composicao"]] == [
        ("bovino", 2000.0, 100.0)
    ]


def test_pecuaria_rebanho_inexistente(api: APIClient, dados_observatorio: dict) -> None:
    assert get(api, "pecuaria?rebanho=dinossauro")[0] == 404


def test_pecuaria_inicio_maior_que_fim(api: APIClient, dados_observatorio: dict) -> None:
    status, corpo = get(api, "pecuaria?inicio=2024&fim=2015")
    assert status == 400 and "inicio" in corpo["campos"]


def test_pecuaria_fim_padrao_e_ultimo_ano_com_efetivo(
    api: APIClient, dados_observatorio: dict
) -> None:
    _, corpo = get(api, "pecuaria?fim=2015")
    assert corpo["filtros"]["valores"] == {"rebanho": "bovino", "inicio": 2006, "fim": 2015}
    assert corpo["metricas"]["efetivo_final"] == 1000.0
    assert corpo["metricas"]["variacao_pct"] is None


def test_pecuaria_composicao_exclui_subtotais(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    for slug, nome, codigo in [
        ("galinaceos-total", "Galináceos - total", "2681"),
        ("suino-matrizes-de-suinos", "Matrizes de suínos", "32794"),
        ("galinhas", "Galinhas", "2675"),
    ]:
        p = Produto.objects.create(
            slug=slug, codigo_ibge=codigo, nome=nome, segmento="pecuaria", tabela_origem=3939
        )
        lancar(p, "efetivo", "1100015", 2024, 1000 if slug == "galinhas" else 5000, carga)
    _, corpo = get(api, "pecuaria")
    comp = corpo["series"]["composicao"]
    assert [(i["slug"], i["valor"], i["participacao"]) for i in comp] == [
        ("bovino", 2000.0, 66.7),
        ("galinhas", 1000.0, 33.3),
    ]


def test_pecuaria_sem_dados(api: APIClient, db: None) -> None:
    status, corpo = get(api, "pecuaria")
    assert status == 200
    assert corpo["series"].get("efetivo", []) == []
    assert corpo["texto"]["manchete"] == r.AVISO_SEM_DADOS
    assert r.AVISO_SEM_DADOS in corpo["qualidade"]["avisos"]


def test_pecuaria_sem_ipca_so_degrada_valor_real(
    api: APIClient, dados_observatorio: dict
) -> None:
    IndicePreco.objects.all().delete()
    status, corpo = get(api, "pecuaria")
    assert status == 200
    m = corpo["metricas"]
    assert m["leite"]["valor_real"] is None
    assert m["leite"]["produtividade_l_vaca"] == 2500.0 and m["efetivo_final"] == 2000.0
    assert corpo["series"]["leite_polos"][0]["codigo_ibge"] == "1100015"
    assert corpo["qualidade"]["avisos"] == [r.AVISO_SEM_IPCA, AVISO_BASE_1_1]
    assert corpo["qualidade"]["ano_ref_monetario"] is None


def test_pecuaria_produtividade_so_em_municipios_comuns(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    leite, vacas = dados_observatorio["leite"], dados_observatorio["vacas"]
    lancar(leite, "producao-de-origem-animal", "1100023", 2024, 500, carga)  # sem vacas
    lancar(vacas, "vacas-ordenhadas", "1100031", 2024, 100, carga)  # sem leite
    lancar(vacas, "vacas-ordenhadas", "1100023", 2015, 1, carga)  # sem leite em 2015
    _, corpo = get(api, "pecuaria")
    lt = corpo["metricas"]["leite"]
    # só Alta Floresta tem os dois valores: 2015 = 1000, 2024 = 2500 (o ingênuo daria 2777)
    assert lt["volume_mil_litros"] == 2500.0
    assert lt["produtividade_l_vaca"] == 2500.0
    assert lt["variacao_produtividade_pct"] == 150.0
    polos = {p["codigo_ibge"]: p for p in corpo["series"]["leite_polos"]}
    assert polos["1100015"]["produtividade"] == 2500.0
    assert polos["1100023"]["volume"] == 500.0 and polos["1100023"]["produtividade"] is None


def test_pecuaria_produtividade_sem_municipio_comum_e_none(
    api: APIClient, dados_observatorio: dict
) -> None:
    Medicao.objects.filter(
        produto=dados_observatorio["vacas"], ano=2024, municipio_id="1100015"
    ).delete()
    _, corpo = get(api, "pecuaria")
    lt = corpo["metricas"]["leite"]
    assert lt["volume_mil_litros"] == 2000.0
    assert lt["produtividade_l_vaca"] is None and lt["variacao_produtividade_pct"] is None
    assert "variou" not in corpo["texto"]["manchete"]


def test_pecuaria_sigilo_fica_fora_e_e_avisado(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    lancar(dados_observatorio["bovino"], "efetivo", "1100031", 2024, None, carga, "sigiloso")
    lancar(
        dados_observatorio["leite"],
        "producao-de-origem-animal",
        "1100031",
        2024,
        None,
        carga,
        "sigiloso",
    )
    _, corpo = get(api, "pecuaria")
    assert corpo["metricas"]["efetivo_final"] == 2000.0
    assert corpo["qualidade"]["municipios_sigilosos"] == 1
    assert "1100031" not in [m["codigo_ibge"] for m in corpo["series"]["municipios"]]
    assert "1100031" not in [p["codigo_ibge"] for p in corpo["series"]["leite_polos"]]
    assert corpo["qualidade"]["avisos"] == [
        AVISO_BASE_1_1,
        "1 município com dado sigiloso no rebanho fica fora dos totais e do ranking; "
        "o principal polo pode ser outro.",
        "1 município com dado sigiloso no leite fica fora dos totais e do ranking; "
        "o principal polo pode ser outro.",
    ]


def test_pecuaria_padrao_avisa_base_comum(api: APIClient, dados_observatorio: dict) -> None:
    _, corpo = get(api, "pecuaria")
    assert corpo["qualidade"]["avisos"] == [AVISO_BASE_1_1]


def test_aviso_variacao_base_comum_singular_e_plural() -> None:
    assert r.aviso_variacao_base_comum(1, 1) == AVISO_BASE_1_1
    assert r.aviso_variacao_base_comum(3, 2) == (
        "A variação do rebanho foi calculada sobre os 3 municípios com dado nos dois anos; "
        "2 municípios ficaram de fora."
    )


def test_pecuaria_variacao_exclui_sigiloso_em_apenas_um_ano(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    b = dados_observatorio["bovino"]
    # Cabixi: OK em 2015, sigiloso em 2024. Cacoal: sigiloso em 2015, OK em 2024.
    lancar(b, "efetivo", "1100031", 2015, 9000, carga)
    lancar(b, "efetivo", "1100031", 2024, None, carga, "sigiloso")
    lancar(b, "efetivo", "1100049", 2015, None, carga, "sigiloso")
    lancar(b, "efetivo", "1100049", 2024, 7000, carga)
    _, corpo = get(api, "pecuaria")
    # comum = Alta Floresta (1000 -> 1500); Cabixi, Cacoal e Ariquemes ficam de fora
    assert corpo["metricas"]["variacao_pct"] == 50.0
    assert corpo["metricas"]["efetivo_final"] == 9000.0  # 1500 + 500 + 7000
    assert corpo["series"]["efetivo"][0]["valor"] == 10000.0  # 1000 + 9000
    assert (
        "A variação do rebanho foi calculada sobre o 1 município com dado nos dois anos; "
        "3 municípios ficaram de fora."
    ) in corpo["qualidade"]["avisos"]


def test_pecuaria_variacao_sem_aviso_quando_todos_nos_dois_anos(
    api: APIClient, dados_observatorio: dict, carga: Carga
) -> None:
    lancar(dados_observatorio["bovino"], "efetivo", "1100023", 2015, 500, carga)
    _, corpo = get(api, "pecuaria")
    assert corpo["metricas"]["variacao_pct"] == 33.3  # 1500 -> 2000, igual ao total
    assert corpo["qualidade"]["avisos"] == []


def test_pecuaria_variacao_none_sem_municipio_comum(
    api: APIClient, dados_observatorio: dict
) -> None:
    Medicao.objects.filter(
        produto=dados_observatorio["bovino"], ano=2015, municipio_id="1100015"
    ).update(municipio_id="1100031")
    _, corpo = get(api, "pecuaria")
    assert corpo["metricas"]["variacao_pct"] is None
    assert corpo["metricas"]["efetivo_final"] == 2000.0
