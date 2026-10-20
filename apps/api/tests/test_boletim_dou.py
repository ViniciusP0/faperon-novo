from datetime import date
from pathlib import Path

import pytest
import requests

from boletim.fontes import FonteIndisponivel
from boletim.fontes.dou import baixar_dou, baixar_texto_nota, ler_pagina_dou

FIXTURE = Path(__file__).parent / "fixtures" / "boletim" / "dou_20-10-2026_do1.html"
DIA = date(2026, 10, 20)


def _html() -> str:
    return FIXTURE.read_text(encoding="utf-8")


def test_le_atos_do_dia():
    atos = ler_pagina_dou(_html(), DIA, "DO1")
    assert atos
    assert all(a.edicao == "198" and a.fonte == "dou" for a in atos)
    assert all(a.dia == DIA and a.secao == "do1" for a in atos)


def test_monta_url_da_nota():
    atos = ler_pagina_dou(_html(), DIA, "DO1")
    alvo = "portaria-n-2.276-de-19-de-outubro-de-2026-739139553"
    ato = next(a for a in atos if a.id_externo == alvo)
    assert ato.url == f"https://www.in.gov.br/web/dou/-/{alvo}"
    assert ato.orgao.startswith("Ministério do Desenvolvimento Agrário")


def test_pagina_sem_params_levanta():
    with pytest.raises(FonteIndisponivel):
        ler_pagina_dou("<html></html>", DIA, "DO1")


def test_baixar_usa_user_agent_de_navegador():
    chamadas = []

    class Resposta:
        status_code = 200
        content = _html().encode("utf-8")
        encoding = "latin-1"

    class HttpFalso:
        def get(self, url, **kwargs):
            chamadas.append((url, kwargs))
            return Resposta()

    atos = baixar_dou(DIA, "do1", http=HttpFalso())
    assert atos
    url, kwargs = chamadas[0]
    assert kwargs["params"]["data"] == "20-10-2026"
    assert "Mozilla" in kwargs["headers"]["User-Agent"]
    assert kwargs["timeout"] == 60


def test_baixar_status_de_erro_levanta():
    class Resposta:
        status_code = 503
        text = ""
        content = b""

    class HttpFalso:
        def get(self, url, **kwargs):
            return Resposta()

    with pytest.raises(FonteIndisponivel):
        baixar_dou(DIA, "do1", http=HttpFalso())


def _pagina(json_array: str) -> str:
    return (
        '<script id="params" type="application/json">'
        '{"jsonArray":' + json_array + "}</script>"
    )


def test_json_array_vazio_devolve_lista_vazia():
    assert ler_pagina_dou(_pagina("[]"), DIA, "DO1") == []


def test_item_sem_url_title_e_ignorado():
    itens = '[{"title":"x"}, 5, {"urlTitle":"ok-1","editionNumber":null,"title":null}]'
    atos = ler_pagina_dou(_pagina(itens), DIA, "DO1")
    assert [a.id_externo for a in atos] == ["ok-1"]
    assert atos[0].edicao == ""
    assert atos[0].titulo == "" and atos[0].orgao == ""


@pytest.mark.parametrize("valor", ["null", '"texto"', "{}"])
def test_json_array_que_nao_e_lista_levanta(valor):
    with pytest.raises(FonteIndisponivel):
        ler_pagina_dou(_pagina(valor), DIA, "DO1")


def test_erro_de_rede_levanta():
    class HttpFalso:
        def get(self, url, **kwargs):
            raise requests.ConnectionError("caiu")

    with pytest.raises(FonteIndisponivel):
        baixar_dou(DIA, "do1", http=HttpFalso())


def test_baixar_decodifica_utf8_mesmo_com_encoding_errado():
    corpo = _pagina('[{"urlTitle":"a","title":"Ação"}]')

    class Resposta:
        status_code = 200
        encoding = "ISO-8859-1"
        content = corpo.encode("utf-8")
        text = corpo.encode("utf-8").decode("latin-1")

    class HttpFalso:
        def get(self, url, **kwargs):
            return Resposta()

    assert baixar_dou(DIA, "do1", http=HttpFalso())[0].titulo == "Ação"


_NOTA = (
    '<html><body><div class="texto-dou" id="x"><p>EXTRATO &amp; CONTRATO</p>'
    "<p>Valor   total:\n R$ 1.200.000,00</p></div>\n</div></body></html>"
)


class _HttpNota:
    def __init__(self, status: int = 200, corpo: str = _NOTA):
        self.status, self.corpo, self.chamadas = status, corpo, []

    def get(self, url, **kwargs):
        self.chamadas.append((url, kwargs))

        class Resposta:
            status_code = self.status
            content = self.corpo.encode("utf-8")

        return Resposta()


def test_baixar_texto_nota_limpa_tags_e_espacos():
    http = _HttpNota()
    texto = baixar_texto_nota("https://www.in.gov.br/web/dou/-/nota-1", http=http)
    assert texto == "EXTRATO & CONTRATO Valor total: R$ 1.200.000,00"
    url, kwargs = http.chamadas[0]
    assert url == "https://www.in.gov.br/web/dou/-/nota-1"
    assert "Mozilla" in kwargs["headers"]["User-Agent"] and kwargs["timeout"] == 60


def test_baixar_texto_nota_sem_bloco_levanta():
    with pytest.raises(FonteIndisponivel):
        baixar_texto_nota("http://x", http=_HttpNota(corpo="<html></html>"))


def test_baixar_texto_nota_http_erro_levanta():
    with pytest.raises(FonteIndisponivel):
        baixar_texto_nota("http://x", http=_HttpNota(status=500))
