from datetime import UTC, date, datetime, timedelta
from io import StringIO
from typing import Any

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from django.utils import timezone

from boletim import servico_agenda
from boletim.agenda import coletas_pendentes
from boletim.models import Coleta
from ingestao.management.commands.run_scheduler import rodar_ciclo
from tests.conftest import ClienteFalso

# Porto Velho é UTC-4: 12:00 UTC = 08:00 local
HOJE = date(2026, 10, 20)


def _utc(hora: int, minuto: int = 0, dia: int = 20) -> datetime:
    return datetime(2026, 10, dia, hora, minuto, tzinfo=UTC)


def _ok_ate_ontem() -> dict[tuple[str, date], tuple[str, datetime | None]]:
    return {
        (f, HOJE - timedelta(days=n)): ("ok", None) for f in ("dou", "doe") for n in range(1, 8)
    }


def test_dou_so_depois_das_7h() -> None:
    coletas = _ok_ate_ontem()
    assert coletas_pendentes(_utc(10, 59), coletas) == []  # 06:59 local
    assert coletas_pendentes(_utc(11, 0), coletas) == [("dou", HOJE)]  # 07:00 local


def test_doe_so_depois_das_21h() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", None)}
    assert coletas_pendentes(_utc(0, 59, dia=21), coletas) == []  # 20:59 local
    assert coletas_pendentes(_utc(1, 0, dia=21), coletas) == [("doe", HOJE)]  # 21:00 local


def test_ontem_pendente_volta_a_tentar() -> None:
    ontem = HOJE - timedelta(days=1)
    coletas = _ok_ate_ontem() | {
        ("dou", ontem): ("pendente", _utc(12, dia=19)),
        ("doe", ontem): ("pendente", None),
    }
    del coletas[("dou", ontem - timedelta(days=1))]  # nunca existiu
    resultado = coletas_pendentes(_utc(9), coletas)  # 05:00 local: hoje ainda não vale
    assert resultado == [("dou", ontem - timedelta(days=1)), ("dou", ontem), ("doe", ontem)]


def test_ok_nao_repete() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", _utc(11))}
    assert coletas_pendentes(_utc(2, dia=21), coletas) == [("doe", HOJE)]


def test_falha_espera_uma_hora() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("falha", _utc(12))}
    assert coletas_pendentes(_utc(12, 59), coletas) == []
    assert coletas_pendentes(_utc(13, 0), coletas) == [("dou", HOJE)]
    coletas[("dou", HOJE)] = ("pendente", _utc(12))  # pendente também espera uma hora
    assert coletas_pendentes(_utc(12, 30), coletas) == []
    assert coletas_pendentes(_utc(13, 0), coletas) == [("dou", HOJE)]


def test_ignora_dias_com_mais_de_7() -> None:
    resultado = coletas_pendentes(_utc(12), {})
    dias = {dia for _, dia in resultado}
    assert min(dias) == HOJE - timedelta(days=7)
    assert max(dias) == HOJE
    assert len(resultado) == 8 * 2 - 1  # hoje às 08:00 local: DOU sim, DOE ainda não
    assert resultado == sorted(resultado, key=lambda i: (i[1], i[0] == "doe"))


def test_usa_a_data_local_e_nao_a_utc() -> None:
    # 21/10 02:00 UTC = 20/10 22:00 local: ainda é dia 20 e o DOE já pode sair
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", None)}
    agora = datetime(2026, 10, 21, 2, 0, tzinfo=UTC)
    assert coletas_pendentes(agora, coletas) == [("doe", HOJE)]
    # e o dia 21 não existe ainda
    assert all(dia <= HOJE for _, dia in coletas_pendentes(agora, {}))


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=False, ANTHROPIC_API_KEY="chave")
def test_ciclo_do_scheduler_nao_coleta_com_boletim_desligado(
    monkeypatch: pytest.MonkeyPatch, cliente_soja: ClienteFalso
) -> None:
    def proibida(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("não devia coletar")

    monkeypatch.setattr(servico_agenda, "coletar_dia", proibida)
    monkeypatch.setattr(servico_agenda, "expurgar", proibida)
    rodar_ciclo(cliente_soja)  # type: ignore[arg-type]
    assert Coleta.objects.count() == 0


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_rodar_boletim_coleta_pendentes_e_expurga(monkeypatch: pytest.MonkeyPatch) -> None:
    chamadas: list[tuple[date, str]] = []
    expurgos: list[date] = []
    llm = object()

    def falsa(dia: date, fonte: str, llm_: object, fontes: object = None) -> None:
        assert llm_ is llm
        chamadas.append((dia, fonte))
        Coleta.objects.create(fonte=fonte, dia=dia, status="ok")

    monkeypatch.setattr(servico_agenda, "coletar_dia", falsa)
    monkeypatch.setattr(servico_agenda, "expurgar", lambda hoje: expurgos.append(hoje) or 0)
    agora = _utc(12)
    assert servico_agenda.rodar_boletim(agora, llm=llm) == 15  # type: ignore[arg-type]
    assert len(chamadas) == 15 == len(set(chamadas))
    assert expurgos == [HOJE]
    chamadas.clear()
    assert servico_agenda.rodar_boletim(agora, llm=llm) == 0  # type: ignore[arg-type]
    assert chamadas == []


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_rodar_ciclo_isola_falha_do_boletim(
    monkeypatch: pytest.MonkeyPatch, cliente_soja: ClienteFalso
) -> None:
    def quebra() -> None:
        raise RuntimeError("boletim quebrou")

    monkeypatch.setattr("ingestao.management.commands.run_scheduler.rodar_boletim", quebra)
    assert rodar_ciclo(cliente_soja) == 5  # type: ignore[arg-type]


@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="")
def test_comando_recusa_sem_chave() -> None:
    with pytest.raises(CommandError, match="ANTHROPIC_API_KEY"):
        call_command("coletar_boletim")


@override_settings(BOLETIM_ATIVO=False, ANTHROPIC_API_KEY="chave")
def test_comando_recusa_boletim_desligado() -> None:
    with pytest.raises(CommandError, match="desligado"):
        call_command("coletar_boletim")


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_comando_coleta_as_duas_fontes(monkeypatch: pytest.MonkeyPatch) -> None:
    from boletim.management.commands import coletar_boletim

    vistos: list[tuple[date, str]] = []

    def falsa(dia: date, fonte: str, llm: object) -> Coleta:
        vistos.append((dia, fonte))
        return Coleta(fonte=fonte, dia=dia, status="ok", lidos=3)

    monkeypatch.setattr(coletar_boletim, "coletar_dia", falsa)
    saida = StringIO()
    call_command("coletar_boletim", "--dia", "2026-10-19", stdout=saida)
    assert vistos == [(date(2026, 10, 19), "dou"), (date(2026, 10, 19), "doe")]
    assert "dou 2026-10-19 ok lidos=3" in saida.getvalue()
    vistos.clear()
    call_command("coletar_boletim", "--fonte", "doe", stdout=saida)
    assert vistos == [(timezone.localdate(), "doe")]
