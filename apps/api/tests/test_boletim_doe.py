from datetime import date
from pathlib import Path

import pytest
import requests

from boletim.fontes import FonteIndisponivel
from boletim.fontes.doe import baixar_edicao, dividir_edicao, url_pdf

FIXTURE = Path(__file__).parent / "fixtures" / "boletim" / "doe_19-10-2026.txt"
DIA = date(2026, 10, 19)
URL = url_pdf(DIA)


def _atos():
    return dividir_edicao(FIXTURE.read_text(encoding="utf-8"), DIA, URL)


class _Resp:
    def __init__(self, status=200, content=b"%PDF"):
        self.status_code = status
        self.content = content


class _Http:
    def __init__(self, resp=None, erro=None):
        self.resp, self.erro, self.chamadas = resp, erro, []

    def get(self, url, **kw):
        self.chamadas.append((url, kw))
        if self.erro:
            raise self.erro
        return self.resp


def test_acha_portaria_270_da_sepat():
    achados = [a for a in _atos() if a.titulo.startswith("Portaria nº 270")]
    assert len(achados) == 1
    ato = achados[0]
    assert "SEPAT" in ato.orgao
    assert ato.edicao == "201"
    assert ato.pagina == 74
    assert ato.fonte == "doe" and ato.dia == DIA and ato.url == URL
    assert ato.id_externo
    assert "Comissão de Alinhamento Institucional" in ato.texto


def test_acha_avisos_da_idaron():
    avisos = [a for a in _atos() if "IDARON" in a.orgao]
    assert len(avisos) == 3
    assert [a.id_externo for a in avisos] == ["77759029", "77771019", "77764044"]
    assert avisos[0].titulo.startswith("AVISO DE PROCURA DE IMÓVEL")
    assert avisos[0].pagina == 399


def test_texto_do_ato_nao_traz_rodape():
    for ato in _atos():
        assert "Autenticidade pode ser verificada" not in ato.texto
        assert "Rondônia, ed." not in ato.texto
        assert "Segunda-feira, 19 de outubro" not in ato.texto
        assert "Protocolo " not in ato.texto


def test_texto_sem_protocolo_devolve_vazio():
    assert dividir_edicao("nada\naqui\n", DIA, URL) == []
    assert dividir_edicao("", DIA, URL) == []


def test_url_pdf_comum_e_extra():
    base = "https://diof.ro.gov.br/data/uploads/2026/10/"
    assert url_pdf(DIA) == base + "DOE-19-10-2026.pdf"
    assert url_pdf(DIA, "EXTRAORDINARIO-") == base + "DOE-EXTRAORDINARIO-19-10-2026.pdf"
    assert url_pdf(DIA, "-SUPLEMENTAR-1") == base + "DOE-19-10-2026-SUPLEMENTAR-1.pdf"


def test_baixar_edicao_404_devolve_none():
    assert baixar_edicao(DIA, http=_Http(_Resp(404)), pdf_para_texto=lambda b: "x") is None


def test_baixar_edicao_devolve_texto_do_pdf():
    http = _Http(_Resp(200, b"PDFBYTES"))
    recebido = []

    def conversor(dados):
        recebido.append(dados)
        return "texto da edição"

    assert baixar_edicao(DIA, http=http, pdf_para_texto=conversor) == "texto da edição"
    assert recebido == [b"PDFBYTES"]
    assert http.chamadas[0][0] == URL
    assert "User-Agent" in http.chamadas[0][1]["headers"]


def test_baixar_edicao_erro_http_e_rede_viram_indisponivel():
    with pytest.raises(FonteIndisponivel):
        baixar_edicao(DIA, http=_Http(_Resp(500)), pdf_para_texto=lambda b: "x")
    with pytest.raises(FonteIndisponivel):
        baixar_edicao(DIA, http=_Http(erro=requests.ConnectionError("x")), pdf_para_texto=str)


def test_baixar_edicao_pdf_vazio_ou_ilegivel_levanta():
    with pytest.raises(FonteIndisponivel):
        baixar_edicao(DIA, http=_Http(_Resp()), pdf_para_texto=lambda b: "  \n")

    def quebra(dados):
        raise FonteIndisponivel("pdftotext falhou")

    with pytest.raises(FonteIndisponivel):
        baixar_edicao(DIA, http=_Http(_Resp()), pdf_para_texto=quebra)
