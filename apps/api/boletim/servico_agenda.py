"""Liga a agenda ao banco e à coleta; usado pelo scheduler."""

import logging
from datetime import date, datetime, timedelta
from typing import Literal, cast

from django.conf import settings
from django.utils import timezone

from boletim.agenda import JANELA_DIAS, coletas_pendentes
from boletim.coleta import Fontes, coletar_dia, expurgar
from boletim.models import Ato, Coleta
from zetele.cliente import ClienteAnthropic, ClienteLLM

log = logging.getLogger(__name__)


def rodar_boletim(
    agora: datetime | None = None,
    llm: ClienteLLM | None = None,
    fontes: Fontes | None = None,
) -> int:
    """Coleta o que está pendente e expurga o vencido; devolve quantas coletas tentou."""
    if not (settings.BOLETIM_ATIVO and settings.ANTHROPIC_API_KEY):
        return 0
    agora = agora or timezone.now()
    hoje = timezone.localdate(agora)
    janela = max(0, min(JANELA_DIAS, settings.BOLETIM_RETENCAO_DIAS))  # nunca além do expurgo
    desde = hoje - timedelta(days=janela)
    sem_decisao: set[tuple[str, date]] = set(
        Ato.objects.filter(dia__gte=desde, relevante__isnull=True)
        .values_list("fonte", "dia")
        .distinct()
    )
    existentes = {
        (c.fonte, c.dia): (
            # `ok` com atos sem veredito não está terminado: volta a cada hora como falha
            "falha" if c.status == "ok" and (c.fonte, c.dia) in sem_decisao else c.status,
            c.atualizada_em,
        )
        for c in Coleta.objects.filter(dia__gte=desde)
    }
    pendentes = coletas_pendentes(agora, existentes, janela)
    if pendentes:
        llm = llm or ClienteAnthropic(settings.ANTHROPIC_API_KEY, settings.BOLETIM_MODELO)
        for fonte, dia in pendentes:
            try:
                coletar_dia(dia, cast(Literal["dou", "doe"], fonte), llm, fontes)
            except Exception:
                # um item ruim não pode pular os demais nem o expurgo
                log.exception("Boletim: coleta %s %s falhou", fonte, dia)
    expurgar(hoje)
    return len(pendentes)
