"""Perguntas do Zétele vivem 90 dias (ADR 0030); o scheduler apaga o resto a cada passada."""

from datetime import datetime, timedelta

from django.utils import timezone

from zetele.models import ContagemDiaria, Pergunta, PerguntaSistema

RETENCAO = timedelta(days=90)


def limite_expurgo(agora: datetime) -> datetime:
    return agora - RETENCAO


def expurgar_perguntas(agora: datetime | None = None) -> int:
    """Apaga das duas tabelas (site público e sistema) e devolve o total apagado."""
    limite = limite_expurgo(agora or timezone.now())
    total = 0
    for modelo in (Pergunta, PerguntaSistema):
        apagadas, _ = modelo.objects.filter(criada_em__lt=limite).delete()
        total += apagadas
    # contadores diários antigos só servem de histórico de uso: mesma retenção
    ContagemDiaria.objects.filter(dia__lt=limite.date()).delete()
    return total
