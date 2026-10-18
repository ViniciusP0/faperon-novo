"""Se um canal do Zétele pode chamar o modelo agora: chave, disjuntor e orçamento do dia.

Cada canal (site público e sistema) tem o próprio contador diário; o disjuntor é um só, porque a
falha é da Anthropic, não do canal.
"""

from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from zetele.canais import CANAIS

CHAVE_DISJUNTOR = "zetele:disjuntor"
DISJUNTOR_SEGUNDOS = 120


def _chave_dia(canal: str) -> str:
    return f"zetele:{canal}:dia:{timezone.localdate().isoformat()}"


def perguntas_hoje(canal: str = "publico") -> int:
    return int(cache.get(_chave_dia(canal), 0))


def contar_pergunta(canal: str = "publico") -> int:
    """Conta uma chamada ao modelo (pergunta ou, no sistema, interpretação de voz)."""
    chave = _chave_dia(canal)
    cache.add(chave, 0, timeout=2 * 86400)
    return int(cache.incr(chave))


def abrir_disjuntor() -> None:
    """Anthropic falhou: 2 minutos sem tentar, para não prender threads do gunicorn."""
    cache.set(CHAVE_DISJUNTOR, True, timeout=DISJUNTOR_SEGUNDOS)


def estado(canal: str = "publico") -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"disponivel": False, "motivo": "sem_chave"}
    if cache.get(CHAVE_DISJUNTOR):
        return {"disponivel": False, "motivo": "indisponivel"}
    if perguntas_hoje(canal) >= CANAIS[canal].limite_diario:
        return {"disponivel": False, "motivo": "orcamento_diario"}
    return {"disponivel": True, "motivo": None}
