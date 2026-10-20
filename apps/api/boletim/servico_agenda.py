"""Liga a agenda ao banco e à coleta; usado pelo scheduler."""

import logging
from datetime import datetime, timedelta
from typing import Literal, cast

from django.conf import settings
from django.utils import timezone

from boletim.agenda import JANELA_DIAS, coletas_pendentes
from boletim.coleta import Fontes, coletar_dia, expurgar
from boletim.models import Coleta
from zetele.cliente import ClienteAnthropic, ClienteLLM

log = logging.getLogger(__name__)


def rodar_boletim(
    agora: datetime | None = None,
    llm: ClienteLLM | None = None,
    fontes: Fontes | None = None,
) -> int:
    """Coleta o que está pendente e expurga o vencido; devolve quantas coletas rodou."""
    if not (settings.BOLETIM_ATIVO and settings.ANTHROPIC_API_KEY):
        return 0
    agora = agora or timezone.now()
    hoje = timezone.localdate(agora)
    desde = hoje - timedelta(days=JANELA_DIAS)
    existentes = {
        (c.fonte, c.dia): (c.status, c.atualizada_em) for c in Coleta.objects.filter(dia__gte=desde)
    }
    pendentes = coletas_pendentes(agora, existentes)
    if pendentes:
        llm = llm or ClienteAnthropic(settings.ANTHROPIC_API_KEY, settings.BOLETIM_MODELO)
        for fonte, dia in pendentes:
            coletar_dia(dia, cast(Literal["dou", "doe"], fonte), llm, fontes)
    expurgar(hoje)
    return len(pendentes)
