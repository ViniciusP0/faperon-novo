"""Perguntas do Zétele vivem 90 dias (ADR 0030); o scheduler apaga o resto a cada passada."""

from datetime import datetime, timedelta

from django.utils import timezone

from zetele.models import Pergunta

RETENCAO = timedelta(days=90)


def limite_expurgo(agora: datetime) -> datetime:
    return agora - RETENCAO


def expurgar_perguntas(agora: datetime | None = None) -> int:
    apagadas, _ = Pergunta.objects.filter(
        criada_em__lt=limite_expurgo(agora or timezone.now())
    ).delete()
    return apagadas
