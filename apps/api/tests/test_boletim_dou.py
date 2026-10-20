from datetime import date
from pathlib import Path

import pytest

from boletim.fontes import FonteIndisponivel
from boletim.fontes.dou import baixar_dou, ler_pagina_dou

FIXTURE = Path(__file__).parent / "fixtures" / "boletim" / "dou_20-10-2026_do1.html"
DIA = date(2026, 10, 20)


def _html() -> str:
    return FIXTURE.read_text(encoding="utf-8")


def test_le_atos_do_dia():
    atos = ler_pagina_dou(_html(), DIA, "DO1")
    assert atos
    assert all(a.edicao == "198" and a.fonte == "dou" for a in atos)
    assert all(a.dia == DIA and a.secao == "DO1" for a in atos)


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
        text = _html()

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

    class HttpFalso:
        def get(self, url, **kwargs):
            return Resposta()

    with pytest.raises(FonteIndisponivel):
        baixar_dou(DIA, "do1", http=HttpFalso())
