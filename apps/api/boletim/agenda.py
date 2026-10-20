"""Decide o que o boletim deve coletar agora. Regra pura: sem banco, sem relógio, sem rede."""

from collections.abc import Mapping
from datetime import date, datetime, time, timedelta

from django.utils import timezone

HORA_DOU = time(7, 0)  # o DOU do dia sai de manhã
HORA_DOE = time(21, 0)  # o DOE do dia só fecha à noite
JANELA_DIAS = 7
ESPERA_APOS_TENTATIVA = timedelta(hours=1)
DIAS_ATE_DESISTIR_DO_DOE = 2  # DOE pendente além de D+2 (fim de semana, feriado) não volta
FONTES = ("dou", "doe")

Coletas = Mapping[tuple[str, date], tuple[str, datetime | None]]


def _local(dia: date, hora: time) -> datetime:
    return timezone.make_aware(datetime.combine(dia, hora))


def _conferencias(fonte: str, dia: date) -> list[datetime]:
    """Instantes em que uma coleta `ok` ganha nova leitura (notas que chegam depois)."""
    if fonte == "dou":
        return [_local(dia, time(13, 0)), _local(dia, time(21, 0))]
    return [_local(dia + timedelta(days=1), time(7, 0))]


def _precisa(chave: tuple[str, date], coletas: Coletas, agora: datetime, hoje: date) -> bool:
    fonte, dia = chave
    situacao = coletas.get(chave)
    if situacao is None:
        return True
    status, tentada_em = situacao
    if tentada_em is not None and agora - tentada_em < ESPERA_APOS_TENTATIVA:
        return False
    if status == "ok":
        return tentada_em is None or any(
            tentada_em < marco <= agora for marco in _conferencias(fonte, dia)
        )
    # o DOE de fim de semana/feriado nunca sai: não insiste dias depois
    return not (
        fonte == "doe"
        and status == "pendente"
        and hoje > dia + timedelta(days=DIAS_ATE_DESISTIR_DO_DOE)
    )


def coletas_pendentes(
    agora: datetime, coletas: Coletas, janela_dias: int = JANELA_DIAS
) -> list[tuple[str, date]]:
    """Lista `(fonte, dia)` a coletar, dia mais antigo primeiro e DOU antes do DOE.

    `agora` é um instante com fuso; "hoje" e os horários valem no fuso local do projeto.
    `coletas` mapeia `(fonte, dia)` a `(status, atualizada_em)`. Uma coleta `ok` volta a ser
    lida nas conferências (DOU: 13h e 21h do dia; DOE: 7h do dia seguinte), pois notas novas
    podem chegar; depois da última, fica final.
    """
    local = timezone.localtime(agora)
    hoje = local.date()
    pendentes: list[tuple[str, date]] = []
    for atras in range(janela_dias, -1, -1):
        dia = hoje - timedelta(days=atras)
        for fonte in FONTES:
            if atras == 0 and local.time() < (HORA_DOU if fonte == "dou" else HORA_DOE):
                continue
            if _precisa((fonte, dia), coletas, agora, hoje):
                pendentes.append((fonte, dia))
    return pendentes
