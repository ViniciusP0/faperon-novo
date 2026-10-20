from collections.abc import Callable
from contextlib import AbstractContextManager
from datetime import date, timedelta
from itertools import count
from typing import Any

import pytest
from rest_framework.test import APIClient

from boletim import leitura
from boletim.models import Ato, Coleta

pytestmark = pytest.mark.django_db

HOJE = date(2026, 10, 20)
_seq = count(1)


@pytest.fixture(autouse=True)
def _congelar_hoje(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(leitura, "hoje", lambda: HOJE)


def ato(dia: date = HOJE, fonte: str = "doe", **kw: Any) -> Ato:
    n = next(_seq)
    dados: dict[str, Any] = {
        "id_externo": f"x{n}",
        "titulo": "Titulo bruto",
        "texto": "TEXTO SECRETO",
        "titulo_chave": f"Nota {n}",
        "resumo": "Resumo",
        "relevante": True,
        "pontuacao": 5,
        "edicao": "201",
        "url": "https://exemplo.gov.br/ato",
        **kw,
    }
    return Ato.objects.create(fonte=fonte, dia=dia, **dados)


def get(api: APIClient, caminho: str) -> tuple[int, dict]:
    r = api.get(f"/api/v1/boletim/{caminho}")
    return r.status_code, r.json()


def test_dias_lista_7_dias_com_total(api: APIClient) -> None:
    """Adaptado: a janela tem 8 datas (hoje + 7 de retenção), como o expurgo mantém."""
    ato()
    ato(destaque=True)
    ato(relevante=False)
    ato(dia=HOJE - timedelta(days=3))
    Coleta.objects.create(fonte="dou", dia=HOJE, status="ok")
    Coleta.objects.create(fonte="doe", dia=HOJE, status="pendente")
    status, corpo = get(api, "dias")
    assert status == 200
    dias = corpo["dias"]
    assert len(dias) == 8
    assert dias[0] == {
        "dia": "2026-10-20",
        "total": 2,
        "tem_destaque": True,
        "fontes": {"dou": "ok", "doe": "pendente"},
    }
    assert dias[-1]["dia"] == "2026-10-13"
    assert dias[3]["total"] == 1 and dias[3]["tem_destaque"] is True
    assert dias[1] == {
        "dia": "2026-10-19",
        "total": 0,
        "tem_destaque": False,
        "fontes": {"dou": "sem_coleta", "doe": "sem_coleta"},
    }


def test_dia_devolve_destaque_e_ate_10_notas(api: APIClient) -> None:
    for _ in range(14):
        ato()
    d = ato(destaque=True, pontuacao=1)
    status, corpo = get(api, "dia/2026-10-20")
    assert status == 200
    assert corpo["destaque"]["id"] == d.pk
    assert len(corpo["notas"]) == 10
    assert d.pk not in [n["id"] for n in corpo["notas"]]
    assert corpo["total"] == 15


def test_todas_devolve_o_resto(api: APIClient) -> None:
    for _ in range(14):
        ato()
    _, corpo = get(api, "dia/2026-10-20?todas=1")
    assert len(corpo["notas"]) == 13 and corpo["total"] == 14


def test_ordem_das_notas(api: APIClient) -> None:
    a = ato(pontuacao=9)
    b = ato(pontuacao=3, rondonia=True)
    c = ato(pontuacao=7)
    _, corpo = get(api, "dia/2026-10-20")
    ids = [corpo["destaque"]["id"]] + [n["id"] for n in corpo["notas"]]
    assert ids == [b.pk, a.pk, c.pk]


def test_filtro_de_origem(api: APIClient) -> None:
    ato(fonte="doe")
    ato(fonte="dou")
    ato(fonte="dou")
    _, corpo = get(api, "dia/2026-10-20?origem=uniao&todas=1")
    assert corpo["total"] == 2
    assert {corpo["destaque"]["origem"]} | {n["origem"] for n in corpo["notas"]} == {"uniao"}
    _, corpo = get(api, "dia/2026-10-20?origem=estado")
    assert corpo["total"] == 1 and corpo["notas"] == []


def test_destaque_do_filtro_quando_o_destaque_do_dia_e_de_outra_origem(api: APIClient) -> None:
    ato(fonte="doe", destaque=True, rondonia=True, pontuacao=9)
    fraco = ato(fonte="dou", pontuacao=2)
    forte = ato(fonte="dou", pontuacao=6)
    _, corpo = get(api, "dia/2026-10-20?origem=uniao")
    assert corpo["destaque"]["id"] == forte.pk
    assert [n["id"] for n in corpo["notas"]] == [fraco.pk]


def test_dia_sem_notas_devolve_vazio_e_status_das_fontes(api: APIClient) -> None:
    Coleta.objects.create(fonte="doe", dia=HOJE, status="falha", erro="x" * 500)
    status, corpo = get(api, "dia/2026-10-20")
    assert status == 200
    assert corpo["destaque"] is None and corpo["notas"] == [] and corpo["total"] == 0
    assert corpo["fontes"]["dou"] == {"status": "sem_coleta", "erro": ""}
    assert corpo["fontes"]["doe"]["status"] == "falha"
    assert corpo["fontes"]["doe"]["erro"] == "Não foi possível ler o diário neste dia."


def test_dia_fora_da_janela_404(api: APIClient) -> None:
    for caminho in ("2026-10-12", "2026-10-21"):
        status, corpo = get(api, f"dia/{caminho}")
        assert status == 404 and "erro" in corpo and corpo["campos"] == {}
    assert get(api, "dia/2026-10-13")[0] == 200


def test_data_invalida_400(api: APIClient) -> None:
    status, corpo = get(api, "dia/ontem")
    assert status == 400 and "erro" in corpo and "dia" in corpo["campos"]
    assert get(api, "dia/2026-02-30")[0] == 400


def test_parametros_invalidos_400(api: APIClient) -> None:
    assert get(api, "dia/2026-10-20?origem=marte")[0] == 400
    status, corpo = get(api, "dia/2026-10-20?todas=sim")
    assert status == 400 and "todas" in corpo["campos"]


def test_nota_traz_link_original_e_diario(api: APIClient) -> None:
    ato(fonte="doe", edicao="201", orgao="SEAGRI", titulo_chave="Portaria X")
    ato(fonte="dou", edicao="", dia=HOJE - timedelta(days=1), url="https://dou/1")
    _, corpo = get(api, "dia/2026-10-20")
    assert corpo["destaque"] == {
        "id": corpo["destaque"]["id"],
        "origem": "estado",
        "diario": "DOE-RO nº 201",
        "orgao": "SEAGRI",
        "titulo": "Portaria X",
        "resumo": "Resumo",
        "rondonia": False,
        "data": "2026-10-20",
        "url": "https://exemplo.gov.br/ato",
    }
    _, corpo = get(api, "dia/2026-10-19")
    assert corpo["destaque"]["diario"] == "DOU"
    assert corpo["destaque"]["origem"] == "uniao"


def test_nao_expoe_atos_irrelevantes(api: APIClient) -> None:
    ato(relevante=False)
    ato(relevante=None)
    visivel = ato()
    _, corpo = get(api, "dia/2026-10-20?todas=1")
    assert corpo["total"] == 1 and corpo["destaque"]["id"] == visivel.pk
    assert corpo["notas"] == []


def test_resposta_nao_traz_texto_nem_pontuacao(api: APIClient) -> None:
    ato()
    ato()
    bruto = api.get("/api/v1/boletim/dia/2026-10-20?todas=1").content.decode()
    assert "TEXTO SECRETO" not in bruto
    assert "pontuacao" not in bruto and "texto" not in bruto and "id_externo" not in bruto


def test_consultas_sao_poucas(
    api: APIClient,
    django_assert_max_num_queries: Callable[[int], AbstractContextManager[Any]],
) -> None:
    for _ in range(12):
        ato()
    with django_assert_max_num_queries(6):
        api.get("/api/v1/boletim/dia/2026-10-20")
    with django_assert_max_num_queries(6):
        api.get("/api/v1/boletim/dias")


def test_rotas_existem_no_schema(api: APIClient) -> None:
    schema = api.get("/api/schema/").content.decode()
    assert "/api/v1/boletim/dias" in schema and "/api/v1/boletim/dia/{dia}" in schema


def test_erro_interno_da_coleta_nao_vaza(api: APIClient) -> None:
    Coleta.objects.create(
        fonte="doe",
        dia=HOJE,
        status="falha",
        erro='OperationalError: connection to server at "db" (10.0.0.5), user "faperon"',
    )
    Coleta.objects.create(fonte="dou", dia=HOJE, status="pendente", erro="segredo-interno")
    bruto = api.get("/api/v1/boletim/dia/2026-10-20").content.decode()
    for proibido in ("OperationalError", "db", "10.0.0.5", "faperon", "segredo-interno"):
        assert proibido not in bruto
    fontes = api.get("/api/v1/boletim/dia/2026-10-20").json()["fontes"]
    assert fontes["dou"]["erro"] == "Edição ainda não publicada."


def test_data_em_formato_nao_estrito_400(api: APIClient) -> None:
    for texto in ("20261020", "2026-W43-2", "2026-1-5"):
        assert get(api, f"dia/{texto}")[0] == 400
