from datetime import date
from decimal import Decimal
from pathlib import Path

from django.test import override_settings

from boletim.fontes.doe import dividir_edicao
from boletim.fontes.dou import ler_pagina_dou
from boletim.tipos import AtoBruto
from boletim.triagem import extrair_valor, triar

FIXTURES = Path(__file__).parent / "fixtures" / "boletim"


def _dou(arquivo: str, dia: int, secao: str) -> list[AtoBruto]:
    html = (FIXTURES / arquivo).read_text(encoding="utf-8")
    return ler_pagina_dou(html, date(2026, 10, dia), secao)


def _achar(atos: list[AtoBruto], trecho: str) -> AtoBruto:
    return next(a for a in atos if trecho in a.id_externo)


def _ato(titulo: str, texto: str, orgao: str = "Prefeitura Municipal de Algum Lugar") -> AtoBruto:
    return AtoBruto(
        fonte="dou", id_externo="x", dia=date(2026, 10, 20), edicao="1", secao="do3",
        orgao=orgao, titulo=titulo, texto=texto, url="https://exemplo.invalid/x",
    )


def test_descarta_portaria_de_pessoal():
    atos = _dou("dou_19-10-2026_do2.html", 19, "DO2")
    assert not triar(_achar(atos, "portaria-de-pessoal-n-322"))
    mapa = _ato(
        "PORTARIA DE PESSOAL SE/MAPA Nº 10, DE 16 DE OUTUBRO DE 2026",
        "Designar servidor para exercer função. Ministério da Agricultura e Pecuária.",
        "Ministério da Agricultura e Pecuária/Secretaria-Executiva",
    )
    assert not triar(mapa)


def test_passa_incra_rondonia():
    atos = _dou("dou_20-10-2026_do1.html", 20, "DO1")
    assert triar(_achar(atos, "portaria-n-2.276"))
    assert triar(_achar(atos, "portaria-n-2.273"))


def test_passa_bcb_credito_rural():
    atos = _dou("dou_20-10-2026_do1.html", 20, "DO1")
    assert triar(_achar(atos, "instrucao-normativa-bcb-n-782"))


def test_passa_anvisa_agrotoxico():
    atos = _dou("dou_19-10-2026_do1.html", 19, "DO1")
    assert triar(_achar(atos, "resolucao-re-n-4.112"))


def test_passa_comissao_de_titulacao_sepat():
    texto = (FIXTURES / "doe_19-10-2026.txt").read_text(encoding="utf-8")
    atos = dividir_edicao(texto, date(2026, 10, 19), "https://exemplo.invalid/doe")
    ato = next(a for a in atos if a.titulo.startswith("Portaria nº 270"))
    assert triar(ato)


def test_descarta_licitacao_sem_valor():
    ato = _ato("AVISO DE LICITAÇÃO PREGÃO Nº 1/2026", "Aquisição de sementes e insumos agropecuários.")
    assert not triar(ato)


@override_settings(BOLETIM_VALOR_MINIMO=500000)
def test_descarta_licitacao_abaixo_do_limite():
    ato = _ato(
        "AVISO DE LICITAÇÃO PREGÃO Nº 1/2026",
        "Aquisição de sementes para a agricultura familiar, valor estimado de R$ 499.999,99.",
    )
    assert not triar(ato)


@override_settings(BOLETIM_VALOR_MINIMO=500000)
def test_passa_licitacao_agro_acima_do_limite():
    ato = _ato(
        "AVISO DE LICITAÇÃO PREGÃO Nº 1/2026",
        "Aquisição de sementes para a agricultura familiar, valor estimado de R$ 500.000,00.",
    )
    assert triar(ato)


def test_extrair_valor_formatos():
    assert extrair_valor("total R$ 1.234.567,89 estimado") == Decimal("1234567.89")
    assert extrair_valor("cerca de R$ 2 milhões") == Decimal("2000000")
    assert extrair_valor("R$ 500 mil") == Decimal("500000")
    assert extrair_valor("itens de R$ 10,00 e R$ 3.000,00") == Decimal("3000.00")
    assert extrair_valor("sem valor nenhum") is None


def test_nao_passa_so_por_palavra_rural():
    ato = _ato(
        "Decreto nº 5/2026",
        "Dispõe sobre a iluminação pública na zona rural do município e a cooperativa de eletrificação.",
    )
    assert not triar(ato)
