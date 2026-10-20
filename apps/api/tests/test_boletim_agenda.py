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
from boletim.models import Ato, Coleta
from ingestao.management.commands.run_scheduler import rodar_ciclo
from tests.conftest import ClienteFalso

# Porto Velho é UTC-4: 12:00 UTC = 08:00 local
HOJE = date(2026, 10, 20)

Mapa = dict[tuple[str, date], tuple[str, datetime | None]]


def _utc(hora: int, minuto: int = 0, dia: int = 20) -> datetime:
    return datetime(2026, 10, dia, hora, minuto, tzinfo=UTC)


def _ok_ate_ontem() -> Mapa:
    """Dias anteriores já conferidos depois da última conferência: `ok` final."""
    return {
        (f, HOJE - timedelta(days=n)): ("ok", _utc(12) - timedelta(days=n - 1))
        for f in ("dou", "doe")
        for n in range(1, 8)
    }


def test_dou_so_depois_das_7h() -> None:
    coletas = _ok_ate_ontem()
    assert coletas_pendentes(_utc(10, 59), coletas) == []  # 06:59 local
    assert coletas_pendentes(_utc(11, 0), coletas) == [("dou", HOJE)]  # 07:00 local


def test_doe_so_depois_das_21h() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", _utc(1, 0, dia=21))}
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


def test_ok_e_final_depois_da_ultima_conferencia() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", _utc(2, dia=21))}  # 22:00 local
    assert coletas_pendentes(_utc(2, dia=21), coletas) == [("doe", HOJE)]
    assert coletas_pendentes(_utc(9, dia=21), coletas) == [("doe", HOJE)]  # DOU de hoje: final


def test_dou_ok_volta_depois_das_13h_e_das_21h() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", _utc(12))}  # ok às 08:00 local
    assert coletas_pendentes(_utc(16, 59), coletas) == []  # 12:59 local
    assert coletas_pendentes(_utc(17, 0), coletas) == [("dou", HOJE)]  # 13:00 local
    # relida às 13:05: a conferência das 13h está cumprida e só a das 21h resta
    coletas[("dou", HOJE)] = ("ok", _utc(17, 5))
    assert coletas_pendentes(_utc(20, 0), coletas) == []
    assert ("dou", HOJE) in coletas_pendentes(_utc(1, 0, dia=21), coletas)  # 21:00 local
    # relida às 21:05: final
    coletas[("dou", HOJE)] = ("ok", _utc(1, 5, dia=21))
    assert ("dou", HOJE) not in coletas_pendentes(_utc(9, dia=21), coletas)


def test_doe_ok_volta_as_7h_do_dia_seguinte() -> None:
    ontem = HOJE - timedelta(days=1)
    coletas = _ok_ate_ontem() | {("doe", ontem): ("ok", _utc(2))}  # ok às 22:00 local de ontem
    assert coletas_pendentes(_utc(10, 59), coletas) == []  # 06:59 local
    assert coletas_pendentes(_utc(11, 0), coletas) == [("doe", ontem), ("dou", HOJE)]


def test_ok_sem_horario_conta_como_defasado() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", None)}
    assert coletas_pendentes(_utc(12), coletas) == [("dou", HOJE)]


def test_falha_espera_uma_hora() -> None:
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("falha", _utc(12))}
    assert coletas_pendentes(_utc(12, 59), coletas) == []
    assert coletas_pendentes(_utc(13, 0), coletas) == [("dou", HOJE)]
    coletas[("dou", HOJE)] = ("pendente", _utc(12))  # pendente também espera uma hora
    assert coletas_pendentes(_utc(12, 30), coletas) == []
    assert coletas_pendentes(_utc(13, 0), coletas) == [("dou", HOJE)]


def test_doe_pendente_desiste_depois_de_dois_dias() -> None:
    antigo = HOJE - timedelta(days=3)
    recente = HOJE - timedelta(days=2)
    coletas = _ok_ate_ontem() | {
        ("doe", antigo): ("pendente", _utc(1)),
        ("dou", antigo): ("pendente", _utc(1)),
        ("doe", recente): ("pendente", _utc(1)),
    }
    assert coletas_pendentes(_utc(9), coletas) == [("dou", antigo), ("doe", recente)]
    coletas[("doe", antigo)] = ("falha", _utc(1))  # falha continua tentando
    assert ("doe", antigo) in coletas_pendentes(_utc(9), coletas)


def test_ignora_dias_com_mais_de_7() -> None:
    resultado = coletas_pendentes(_utc(12), {})
    dias = {dia for _, dia in resultado}
    assert min(dias) == HOJE - timedelta(days=7)
    assert max(dias) == HOJE
    assert len(resultado) == 8 * 2 - 1  # hoje às 08:00 local: DOU sim, DOE ainda não
    assert resultado == sorted(resultado, key=lambda i: (i[1], i[0] == "doe"))


def test_janela_menor_que_sete() -> None:
    resultado = coletas_pendentes(_utc(12), {}, janela_dias=3)
    assert min(dia for _, dia in resultado) == HOJE - timedelta(days=3)


def test_usa_a_data_local_e_nao_a_utc() -> None:
    # 21/10 02:00 UTC = 20/10 22:00 local: ainda é dia 20 e o DOE já pode sair
    agora = datetime(2026, 10, 21, 2, 0, tzinfo=UTC)
    coletas = _ok_ate_ontem() | {("dou", HOJE): ("ok", agora)}
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


def _registrar(
    chamadas: list[tuple[date, str]], status: str = "ok", agora: datetime | None = None
) -> Any:
    def falsa(dia: date, fonte: str, llm: object, fontes: object = None) -> None:
        chamadas.append((dia, fonte))
        Coleta.objects.update_or_create(fonte=fonte, dia=dia, defaults={"status": status})
        if agora is not None:
            Coleta.objects.filter(fonte=fonte, dia=dia).update(atualizada_em=agora)

    return falsa


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_rodar_boletim_coleta_pendentes_e_expurga(monkeypatch: pytest.MonkeyPatch) -> None:
    chamadas: list[tuple[date, str]] = []
    expurgos: list[date] = []
    agora = _utc(12)
    monkeypatch.setattr(servico_agenda, "coletar_dia", _registrar(chamadas, agora=agora))
    monkeypatch.setattr(servico_agenda, "expurgar", lambda hoje: expurgos.append(hoje) or 0)
    llm: Any = object()
    assert servico_agenda.rodar_boletim(agora, llm=llm) == 15
    assert len(chamadas) == 15 == len(set(chamadas))
    assert expurgos == [HOJE]
    chamadas.clear()
    assert servico_agenda.rodar_boletim(agora, llm=llm) == 0
    assert chamadas == []


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave", BOLETIM_RETENCAO_DIAS=3)
def test_rodar_boletim_respeita_a_retencao(monkeypatch: pytest.MonkeyPatch) -> None:
    chamadas: list[tuple[date, str]] = []
    monkeypatch.setattr(servico_agenda, "coletar_dia", _registrar(chamadas))
    monkeypatch.setattr(servico_agenda, "expurgar", lambda hoje: 0)
    servico_agenda.rodar_boletim(_utc(12), llm=object())  # type: ignore[arg-type]
    assert min(dia for dia, _ in chamadas) == HOJE - timedelta(days=3)


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_rodar_boletim_repete_ok_com_atos_sem_veredito(monkeypatch: pytest.MonkeyPatch) -> None:
    agora = _utc(12)
    ontem = HOJE - timedelta(days=1)
    for n in range(0, 8):
        dia = HOJE - timedelta(days=n)
        for fonte in ("dou", "doe"):
            if dia == HOJE and fonte == "doe":
                continue  # ainda não é hora do DOE de hoje
            Coleta.objects.create(fonte=fonte, dia=dia, status="ok")
            Coleta.objects.filter(fonte=fonte, dia=dia).update(atualizada_em=agora)
    Ato.objects.create(fonte="dou", id_externo="x", dia=ontem, titulo="t", relevante=None)
    chamadas: list[tuple[date, str]] = []
    monkeypatch.setattr(servico_agenda, "coletar_dia", _registrar(chamadas))
    monkeypatch.setattr(servico_agenda, "expurgar", lambda hoje: 0)
    llm: Any = object()
    alvo = Coleta.objects.filter(fonte="dou", dia=ontem)
    alvo.update(atualizada_em=agora - timedelta(minutes=30))  # espera a hora cheia
    assert servico_agenda.rodar_boletim(agora, llm=llm) == 0
    alvo.update(atualizada_em=agora - timedelta(hours=1))
    assert servico_agenda.rodar_boletim(agora, llm=llm) == 1
    assert chamadas == [(ontem, "dou")]


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_rodar_boletim_espera_uma_hora_com_atualizada_em_real(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chamadas: list[tuple[date, str]] = []
    monkeypatch.setattr(servico_agenda, "coletar_dia", _registrar(chamadas, status="falha"))
    monkeypatch.setattr(servico_agenda, "expurgar", lambda hoje: 0)
    llm: Any = object()
    assert servico_agenda.rodar_boletim(timezone.now(), llm=llm) > 0
    assert servico_agenda.rodar_boletim(timezone.now(), llm=llm) == 0  # auto_now: acabou de falhar


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_rodar_boletim_isola_item_que_quebra(monkeypatch: pytest.MonkeyPatch) -> None:
    chamadas: list[tuple[date, str]] = []
    expurgos: list[date] = []

    def falsa(dia: date, fonte: str, llm: object, fontes: object = None) -> None:
        chamadas.append((dia, fonte))
        if len(chamadas) == 1:
            raise RuntimeError("item ruim")

    monkeypatch.setattr(servico_agenda, "coletar_dia", falsa)
    monkeypatch.setattr(servico_agenda, "expurgar", lambda hoje: expurgos.append(hoje) or 0)
    assert servico_agenda.rodar_boletim(_utc(12), llm=object()) == 15  # type: ignore[arg-type]
    assert len(chamadas) == 15
    assert expurgos == [HOJE]


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


@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_comando_recusa_dia_invalido_e_futuro() -> None:
    with pytest.raises(CommandError, match="inválida"):
        call_command("coletar_boletim", "--dia", "20/10/2026")
    amanha = (timezone.localdate() + timedelta(days=1)).isoformat()
    with pytest.raises(CommandError, match="futuro"):
        call_command("coletar_boletim", "--dia", amanha)


@pytest.mark.django_db
@override_settings(BOLETIM_ATIVO=True, ANTHROPIC_API_KEY="chave")
def test_comando_coleta_as_duas_fontes(monkeypatch: pytest.MonkeyPatch) -> None:
    from boletim.management.commands import coletar_boletim

    vistos: list[tuple[date, str]] = []

    def falsa(dia: date, fonte: str, llm: object) -> Coleta:
        vistos.append((dia, fonte))
        if fonte == "doe":
            return Coleta(fonte=fonte, dia=dia, status="falha", erro="DOE fora do ar")
        return Coleta(fonte=fonte, dia=dia, status="ok", lidos=3)

    monkeypatch.setattr(coletar_boletim, "coletar_dia", falsa)
    saida = StringIO()
    call_command("coletar_boletim", "--dia", "2026-10-19", stdout=saida)
    assert vistos == [(date(2026, 10, 19), "dou"), (date(2026, 10, 19), "doe")]
    assert "dou 2026-10-19 ok lidos=3" in saida.getvalue()
    assert "DOE fora do ar" in saida.getvalue()
    vistos.clear()
    call_command("coletar_boletim", "--fonte", "doe", stdout=saida)
    assert vistos == [(timezone.localdate(), "doe")]
