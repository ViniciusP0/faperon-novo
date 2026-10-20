"""Decide o que o boletim deve coletar agora. Regra pura: sem banco, sem relógio, sem rede."""

from collections.abc import Mapping
from datetime import date, datetime, time, timedelta

from django.utils import timezone

HORA_DOU = time(7, 0)  # o DOU do dia sai de manhã
HORA_DOE = time(21, 0)  # o DOE do dia só fecha à noite
JANELA_DIAS = 7
ESPERA_APOS_TENTATIVA = timedelta(hours=1)
FONTES = ("dou", "doe")

Coletas = Mapping[tuple[str, date], tuple[str, datetime | None]]


def _precisa(chave: tuple[str, date], coletas: Coletas, agora: datetime) -> bool:
    situacao = coletas.get(chave)
    if situacao is None:
        return True
    status, tentada_em = situacao
    if status == "ok":
        return False
    return tentada_em is None or agora - tentada_em >= ESPERA_APOS_TENTATIVA


def coletas_pendentes(agora: datetime, coletas: Coletas) -> list[tuple[str, date]]:
    """Lista `(fonte, dia)` a coletar, dia mais antigo primeiro e DOU antes do DOE.

    `agora` é um instante com fuso; "hoje" e os horários valem no fuso local do projeto.
    `coletas` mapeia `(fonte, dia)` a `(status, atualizada_em)`.
    """
    local = timezone.localtime(agora)
    hoje = local.date()
    pendentes: list[tuple[str, date]] = []
    for atras in range(JANELA_DIAS, -1, -1):
        dia = hoje - timedelta(days=atras)
        for fonte in FONTES:
            if atras == 0 and local.time() < (HORA_DOU if fonte == "dou" else HORA_DOE):
                continue
            if _precisa((fonte, dia), coletas, agora):
                pendentes.append((fonte, dia))
    return pendentes
