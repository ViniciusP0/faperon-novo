from decimal import Decimal

import pytest
from django.core.cache import cache
from hypothesis import given
from hypothesis import strategies as st
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle

from analise import graficos, pdf, regras
from analise.models import Relatorio
from indicadores.dominio import ItemRanking
from indicadores.models import Produto
from ingestao.models import Carga

D = Decimal
CTX = regras.Contexto("Soja (em grão)", "Quantidade produzida", "Toneladas", "Rondônia", 2015, 2024)
Q = "produto=soja-em-grao&indicador=quantidade-produzida&inicio=2022&fim=2024"


def ranking(*valores: int | None) -> list[ItemRanking]:
    itens = []
    for n, v in enumerate(valores, start=1):
        if v is None:
            itens.append(ItemRanking(str(n), f"M{n}", None, "sigiloso", None, None))
        else:
            itens.append(ItemRanking(str(n), f"M{n}", D(v), "ok", n, D(v) / 10))
    return itens


def test_formatar_numero_pt_br() -> None:
    assert regras.formatar_numero(D(1234567)) == "1.234.567"
    assert regras.formatar_numero(D("12.5")) == "12,50"
    assert regras.formatar_numero(D(7)) == "7"
    assert regras.formatar_numero(D("1234.5")) == "1.235"
    assert regras.formatar_numero(D("8.876"), 1) == "8,9"
    assert regras.formatar_numero(-3.14159, 1) == "-3,1"


def test_metricas_variacao_cagr_extremos_e_concentracao() -> None:
    pontos = [(2022, D(100)), (2023, D(150)), (2024, D(200))]
    top = ranking(50, 30, 10, 5, 3, 2)
    m = regras.calcular_metricas(pontos, top, D(100), "soma")
    assert (m.variacao_absoluta, m.variacao_percentual) == (D(100), D(100))
    assert m.cagr_percentual == pytest.approx(41.42, abs=0.01)
    assert m.maior_ano == (2024, D(200)) and m.menor_ano == (2022, D(100))
    assert [t.nome for t in m.top5] == ["M1", "M2", "M3", "M4", "M5"]
    assert m.concentracao_top5_percentual == D(98)


def test_metricas_ignoram_pontos_sem_valor_e_nao_calculam_o_impossivel() -> None:
    m = regras.calcular_metricas([(2022, None), (2023, D(0)), (2024, D(10))], [], None, "soma")
    assert m.variacao_absoluta == D(10)
    assert m.variacao_percentual is None  # base zero
    assert m.cagr_percentual is None
    assert m.concentracao_top5_percentual is None
    vazia = regras.calcular_metricas([(2022, None)], [], None, "soma")
    assert vazia.valor_inicial is None and vazia.maior_ano is None


def test_media_ponderada_nao_tem_concentracao() -> None:
    m = regras.calcular_metricas([(2024, D(1))], ranking(5, 4), D(3), "media_ponderada")
    assert m.concentracao_top5_percentual is None


@pytest.mark.parametrize(
    ("pct", "esperado"), [("70", "alta"), ("69.9", "moderada"), ("40", "moderada"), ("39", "baixa")]
)
def test_classificacao_de_concentracao(pct: str, esperado: str) -> None:
    assert regras.classificar_concentracao(D(pct)) == esperado


def test_paragrafos_crescimento() -> None:
    pontos = [(2015, D(1000)), (2019, D(1500)), (2024, D(2000))]
    m = regras.calcular_metricas(pontos, ranking(60, 20, 10, 5, 3), D(100), "soma")
    texto = regras.gerar_paragrafos(CTX, m)
    assert texto[0] == (
        "Em Rondônia, quantidade produzida de Soja (em grão) passou de 1.000 Toneladas em 2015 "
        "para 2.000 Toneladas em 2024, um crescimento de 100,0% (+1.000 Toneladas)."
    )
    assert "CAGR" in texto[1] and "+8,0% ao ano" in texto[1]
    assert (
        texto[2]
        == "O maior valor da série foi 2.000 Toneladas em 2024; o menor foi 1.000 Toneladas em 2015."
    )
    assert "cinco maiores municípios" in texto[3] and "M1 (60 Toneladas, 6,0% do total)" in texto[3]
    assert "concentração alta" in texto[4]


def test_paragrafos_queda_estabilidade_e_casos_de_borda() -> None:
    queda = regras.gerar_paragrafos(
        CTX, regras.calcular_metricas([(2015, D(200)), (2024, D(100))], [], None, "soma")
    )
    assert "uma queda de 50,0% (-100 Toneladas)" in queda[0]
    estavel = regras.gerar_paragrafos(
        CTX, regras.calcular_metricas([(2015, D(1000)), (2024, D(1000))], [], None, "soma")
    )
    assert "estabilidade (0,0%)" in estavel[0]
    unico = regras.gerar_paragrafos(CTX, regras.calcular_metricas([(2024, D(9))], [], None, "soma"))
    assert unico == [
        "Em Rondônia, o único ano com dados de quantidade produzida de Soja (em grão) no período é 2024: 9 Toneladas."
    ]
    vazio = regras.gerar_paragrafos(CTX, regras.calcular_metricas([], [], None, "soma"))
    assert "Não há dados publicados" in vazio[0]
    base_zero = regras.gerar_paragrafos(
        CTX, regras.calcular_metricas([(2015, D(0)), (2024, D(50))], [], None, "soma")
    )
    assert "uma variação de +50 Toneladas" in base_zero[0]
    assert regras.gerar_titulo(CTX) == "Soja (em grão) — Quantidade produzida, 2015–2024"
    municipal = regras.Contexto("Soja", "Área", "ha", "Cacoal", 2020, 2024)
    assert regras.gerar_titulo(municipal).endswith("(Cacoal)")


@given(
    inicial=st.decimals(min_value=D("1"), max_value=D("1000000"), places=2),
    taxa=st.floats(min_value=-0.5, max_value=2.0),
    anos=st.integers(min_value=1, max_value=40),
)
def test_cagr_reaplicado_reproduz_o_valor_final(inicial: Decimal, taxa: float, anos: int) -> None:
    final = inicial * D(str((1 + taxa) ** anos))
    if final <= 0:
        return
    cagr = regras.calcular_cagr(inicial, final, anos)
    assert cagr is not None
    assert float(inicial) * (1 + cagr / 100) ** anos == pytest.approx(float(final), rel=1e-6)


@given(
    st.lists(
        st.tuples(st.integers(1974, 2024), st.integers(0, 10**6)),
        min_size=2,
        max_size=30,
        unique_by=lambda t: t[0],
    )
)
def test_analise_e_deterministica(pares: list[tuple[int, int]]) -> None:
    pontos = [(a, D(v)) for a, v in pares]
    a = regras.gerar_paragrafos(CTX, regras.calcular_metricas(pontos, [], None, "soma"))
    b = regras.gerar_paragrafos(
        CTX, regras.calcular_metricas(list(reversed(pontos)), [], None, "soma")
    )
    assert a == b


# --- endpoint ---------------------------------------------------------------


@pytest.mark.django_db
def test_endpoint_analise(api: APIClient, dados_soja: Produto) -> None:
    resposta = api.get(f"/api/v1/analise?{Q}")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["titulo"] == "Soja (em grão) — Quantidade produzida, 2022–2024"
    m = corpo["metricas"]
    assert m["variacao_absoluta"] == 150 and m["variacao_percentual"] == pytest.approx(33.33)
    assert m["maior_ano"] == {"ano": 2024, "valor": 600} and m["menor_ano"]["ano"] == 2022
    assert [t["municipio"]["nome"] for t in m["top5"]] == ["Ariquemes", "Alta Floresta D'Oeste"]
    assert m["concentracao_top5_percentual"] == 100.0
    assert corpo["meta"]["tabela_sidra"] == 5457
    assert api.get(f"/api/v1/analise?{Q}").json() == corpo  # determinístico


@pytest.mark.django_db
def test_endpoint_analise_de_municipio_e_erros(api: APIClient, dados_soja: Produto) -> None:
    corpo = api.get(f"/api/v1/analise?{Q}&municipio=1100023").json()
    assert corpo["titulo"].endswith("(Ariquemes)")
    assert corpo["metricas"]["variacao_absoluta"] == 150
    assert api.get("/api/v1/analise?produto=x&indicador=y").status_code == 404
    assert api.get("/api/v1/analise?produto=x").status_code == 400


# --- gráficos e PDF ----------------------------------------------------------


def test_grafico_colunas_svg() -> None:
    svg = graficos.grafico_colunas([2022, 2023], [("Soja", [10.0, None])])
    assert svg.startswith("<svg") and svg.count("<rect") == 1 and "2022" in svg
    agrupado = graficos.grafico_colunas([2022], [("A & B", [1.0]), ("C", [2.0])])
    assert (
        agrupado.count("<rect") == 4 and "A &amp; B" in agrupado
    )  # 2 colunas + 2 chaves da legenda
    assert graficos.grafico_colunas([], [("x", [])]).endswith("</svg>")


@pytest.mark.parametrize(
    ("maximo", "teto"), [(0, 1), (7, 8), (1200, 1200), (2221610, 2400000), (5, 6), (0.3, 0.32)]
)
def test_teto_do_eixo(maximo: float, teto: float) -> None:
    assert graficos._teto(maximo) == pytest.approx(teto)


@pytest.mark.django_db
def test_relatorio_pdf(api: APIClient, dados_soja: Produto) -> None:
    resposta = api.get(f"/api/v1/relatorio.pdf?{Q}&municipios=1100015,1100023")
    assert resposta.status_code == 200
    assert resposta["Content-Type"] == "application/pdf"
    assert resposta["Content-Disposition"] == (
        'attachment; filename="faperon-soja-em-grao-quantidade-produzida-2022-2024.pdf"'
    )
    conteudo = resposta.content
    assert conteudo.startswith(b"%PDF") and len(conteudo) > 5_000


@pytest.mark.django_db
def test_mesmo_recorte_reusa_o_pdf_em_cache(api: APIClient, dados_soja: Produto) -> None:
    primeiro = api.get(f"/api/v1/relatorio.pdf?{Q}").content
    assert Relatorio.objects.count() == 1
    segundo = api.get(f"/api/v1/relatorio.pdf?{Q}").content
    assert segundo == primeiro and Relatorio.objects.count() == 1
    api.get(
        "/api/v1/relatorio.pdf?produto=soja-em-grao&indicador=quantidade-produzida&inicio=2023&fim=2024"
    )
    assert Relatorio.objects.count() == 2


@pytest.mark.django_db
def test_nova_carga_invalida_o_cache(dados_soja: Produto, carga: Carga) -> None:
    antes = pdf.chave_do_recorte({"a": 1})
    Carga.objects.create(tabela=5457, iniciada_em=carga.iniciada_em, status=Carga.Status.SUCESSO)
    assert pdf.chave_do_recorte({"a": 1}) != antes


@pytest.mark.django_db
def test_relatorio_pdf_com_erros_de_parametro(api: APIClient, dados_soja: Produto) -> None:
    assert api.get("/api/v1/relatorio.pdf?produto=x&indicador=y").status_code == 404
    assert api.get("/api/v1/relatorio.pdf").status_code == 400


@pytest.mark.django_db
def test_rate_limit_do_pdf(
    api: APIClient, dados_soja: Produto, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"pdf": "2/min"})
    cache.clear()
    codigos = [api.get(f"/api/v1/relatorio.pdf?{Q}").status_code for _ in range(3)]
    assert codigos == [200, 200, 429]
    corpo = api.get(f"/api/v1/relatorio.pdf?{Q}")
    assert corpo.status_code == 429 and set(corpo.json()) == {"erro", "campos"}
    assert "Retry-After" in corpo
    cache.clear()


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("lista", "esperado"),
    [("9999999", 400), ("1100015", 400), ("1100015,9999999", 404)],
)
def test_pdf_rejeita_comparacao_invalida_sem_gerar_nada(
    api: APIClient, dados_soja: Produto, lista: str, esperado: int
) -> None:
    resposta = api.get(f"/api/v1/relatorio.pdf?{Q}&municipios={lista}")
    assert resposta.status_code == esperado
    assert Relatorio.objects.count() == 0


@pytest.mark.django_db
def test_ordem_e_repeticao_dos_municipios_nao_criam_outro_pdf(
    api: APIClient, dados_soja: Produto
) -> None:
    for municipios in ["1100015,1100023", "1100023,1100015", "1100023,1100015,1100023"]:
        assert api.get(f"/api/v1/relatorio.pdf?{Q}&municipios={municipios}").status_code == 200
    assert Relatorio.objects.count() == 1


@pytest.mark.django_db
def test_limpar_relatorios_apaga_versoes_antigas_e_respeita_o_teto(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(pdf, "MAX_RELATORIOS", 2)
    Relatorio.objects.create(chave="velho", nome_arquivo="a.pdf", pdf=b"x", versao_dados="1")
    for i in range(3):
        Relatorio.objects.create(chave=f"novo{i}", nome_arquivo="b.pdf", pdf=b"x", versao_dados="2")
    assert pdf.limpar_relatorios("2") == 2
    assert set(Relatorio.objects.values_list("chave", flat=True)) == {"novo1", "novo2"}


@pytest.mark.django_db
def test_carga_concluida_limpa_pdfs_da_versao_anterior(
    api: APIClient, dados_soja: Produto, carga: Carga
) -> None:
    from ingestao.signals import carga_concluida

    assert api.get(f"/api/v1/relatorio.pdf?{Q}").status_code == 200
    nova = Carga.objects.create(
        tabela=5457, iniciada_em=carga.iniciada_em, status=Carga.Status.SUCESSO
    )
    carga_concluida.send(sender=Carga, carga=nova)
    assert Relatorio.objects.count() == 0


@pytest.mark.django_db
def test_teto_global_do_pdf_vale_mesmo_com_ip_trocado(
    api: APIClient, dados_soja: Produto, monkeypatch: pytest.MonkeyPatch
) -> None:
    taxas = {"pdf": "100/min", "pdf_global": "2/min"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", taxas)
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", taxas)
    cache.clear()
    codigos = [
        api.get(f"/api/v1/relatorio.pdf?{Q}", HTTP_X_FORWARDED_FOR=f"198.51.100.{i}").status_code
        for i in range(3)
    ]
    assert codigos == [200, 200, 429]
    cache.clear()


@pytest.mark.django_db
def test_recusa_por_ip_nao_consome_o_teto_global(
    api: APIClient, dados_soja: Produto, monkeypatch: pytest.MonkeyPatch
) -> None:
    taxas = {"pdf": "2/min", "pdf_global": "3/min"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", taxas)
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", taxas)
    cache.clear()

    def pedir(ip: str) -> int:
        return api.get(f"/api/v1/relatorio.pdf?{Q}", HTTP_X_FORWARDED_FOR=ip).status_code

    assert [pedir("198.51.100.1") for _ in range(6)] == [200, 200, 429, 429, 429, 429]
    assert pedir("198.51.100.2") == 200
    assert pedir("198.51.100.2") == 429
    cache.clear()


def test_renderizacao_de_pdf_e_serializada_por_processo(monkeypatch: pytest.MonkeyPatch) -> None:
    import threading
    import time

    ativos = 0
    pico = 0
    trava = threading.Lock()

    class HtmlFalso:
        def __init__(self, string: str) -> None:
            pass

        def write_pdf(self) -> bytes:
            nonlocal ativos, pico
            with trava:
                ativos += 1
                pico = max(pico, ativos)
            time.sleep(0.05)
            with trava:
                ativos -= 1
            return b"%PDF"

    monkeypatch.setattr(pdf, "HTML", HtmlFalso)
    threads = [threading.Thread(target=pdf.renderizar, args=("<p/>",)) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert pico == 1


def test_renderizacao_ocupada_demais_levanta_servico_ocupado(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from indicadores.erros import ServicoOcupado

    monkeypatch.setattr(pdf, "ESPERA_RENDERIZACAO", 0.05)
    assert pdf._RENDERIZACAO.acquire(blocking=False)
    try:
        with pytest.raises(ServicoOcupado):
            pdf.renderizar("<p/>")
    finally:
        pdf._RENDERIZACAO.release()
    # liberado o bloqueio, a renderização volta a funcionar
    monkeypatch.setattr(pdf, "HTML", lambda string: type("H", (), {"write_pdf": lambda self: b"%PDF"})())
    assert pdf.renderizar("<p/>") == b"%PDF"


@pytest.mark.django_db
def test_pdf_com_renderizacao_ocupada_responde_503_no_formato_da_api(
    api: APIClient, dados_soja: Produto, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(pdf, "ESPERA_RENDERIZACAO", 0.05)
    assert pdf._RENDERIZACAO.acquire(blocking=False)
    try:
        resposta = api.get(f"/api/v1/relatorio.pdf?{Q}")
    finally:
        pdf._RENDERIZACAO.release()
    assert resposta.status_code == 503
    assert set(resposta.json()) == {"erro", "campos"}
    assert resposta["Retry-After"] == "30"
    assert Relatorio.objects.count() == 0


def _html_do_relatorio(indicador: str) -> str:
    from django.template.loader import render_to_string

    from analise.servico import analisar

    r = analisar("soja-em-grao", indicador, 2022, 2024, None)
    return render_to_string("analise/relatorio.html", pdf._contexto(r, []))


@pytest.mark.django_db
def test_pdf_de_soma_mostra_total_de_rondonia_com_100_por_cento(dados_soja: Produto) -> None:
    html = _html_do_relatorio("quantidade-produzida")
    assert "<strong>Total de Rondônia</strong>" in html
    assert "Média de Rondônia" not in html
    assert '<td class="num">100,0%</td>' in html


@pytest.mark.django_db
def test_pdf_de_media_ponderada_mostra_media_sem_percentual_do_total(dados_soja: Produto) -> None:
    html = _html_do_relatorio("rendimento-medio")
    assert "<strong>Média de Rondônia</strong>" in html
    assert "<strong>3.500</strong>" in html  # (2000 x 50 + 4000 x 150) / 200
    assert "Total de Rondônia" not in html
    assert "100,0%" not in html


@pytest.mark.django_db
def test_pdf_avisa_municipios_sigilosos_fora_do_total(dados_soja: Produto) -> None:
    # Cabixi é sigiloso em 2024 na quantidade produzida
    html = _html_do_relatorio("quantidade-produzida")
    assert "1 município com dado sigiloso fica fora dos totais." in html


@pytest.mark.django_db
def test_pdf_sem_sigilosos_nao_mostra_a_nota(dados_soja: Produto) -> None:
    html = _html_do_relatorio("area-colhida")
    assert "dado sigiloso" not in html


def test_frase_de_sigilosos_no_singular_e_no_plural() -> None:
    assert pdf.frase_sigilosos(1) == "1 município com dado sigiloso fica fora dos totais."
    assert pdf.frase_sigilosos(3) == "3 municípios com dado sigiloso ficam fora dos totais."
