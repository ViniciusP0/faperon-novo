"""Se o Zétele pode chamar o modelo agora: chave, disjuntor e orçamento do dia."""

from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

CHAVE_DISJUNTOR = "zetele:disjuntor"
DISJUNTOR_SEGUNDOS = 120


def _chave_dia() -> str:
    return f"zetele:dia:{timezone.localdate().isoformat()}"


def perguntas_hoje() -> int:
    return int(cache.get(_chave_dia(), 0))


def contar_pergunta() -> int:
    chave = _chave_dia()
    cache.add(chave, 0, timeout=2 * 86400)
    return int(cache.incr(chave))


def abrir_disjuntor() -> None:
    """Anthropic falhou: 2 minutos sem tentar, para não prender threads do gunicorn."""
    cache.set(CHAVE_DISJUNTOR, True, timeout=DISJUNTOR_SEGUNDOS)


def estado() -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"disponivel": False, "motivo": "sem_chave"}
    if cache.get(CHAVE_DISJUNTOR):
        return {"disponivel": False, "motivo": "indisponivel"}
    if perguntas_hoje() >= settings.ZETELE_LIMITE_DIARIO:
        return {"disponivel": False, "motivo": "orcamento_diario"}
    return {"disponivel": True, "motivo": None}
