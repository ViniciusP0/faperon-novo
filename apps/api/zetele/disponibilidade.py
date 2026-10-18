"""Se um canal do Zétele pode chamar o modelo agora: chave, disjuntor e orçamento do dia.

Cada canal (site público e sistema) tem o próprio contador diário, no Postgres (ContagemDiaria): o
incremento é atômico entre os workers do gunicorn e não some com a limpeza do cache. O disjuntor é
um só, no cache, porque a falha é da Anthropic, não do canal.
"""

from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db.models import F
from django.utils import timezone

from zetele.canais import CANAIS
from zetele.models import ContagemDiaria

CHAVE_DISJUNTOR = "zetele:disjuntor"
DISJUNTOR_SEGUNDOS = 120


def perguntas_hoje(canal: str = "publico") -> int:
    total = (
        ContagemDiaria.objects.filter(canal=canal, dia=timezone.localdate())
        .values_list("total", flat=True)
        .first()
    )
    return int(total or 0)


def contar_pergunta(canal: str = "publico") -> int:
    """Conta uma chamada ao modelo (pergunta ou, no sistema, interpretação de voz) e devolve o total."""
    contagem, _ = ContagemDiaria.objects.get_or_create(canal=canal, dia=timezone.localdate())
    ContagemDiaria.objects.filter(pk=contagem.pk).update(total=F("total") + 1)
    return int(ContagemDiaria.objects.filter(pk=contagem.pk).values_list("total", flat=True)[0])


def devolver_pergunta(canal: str = "publico") -> None:
    """Desfaz uma contagem cuja chamada não aconteceu (ex.: teto já estourado)."""
    ContagemDiaria.objects.filter(canal=canal, dia=timezone.localdate(), total__gt=0).update(
        total=F("total") - 1
    )


def abrir_disjuntor() -> None:
    """Anthropic falhou: 2 minutos sem tentar, para não prender threads do gunicorn."""
    cache.set(CHAVE_DISJUNTOR, True, timeout=DISJUNTOR_SEGUNDOS)


def abrir_disjuntor_voz(funcao: str) -> None:
    """Fornecedor de voz falhou ("ouvir" ou "falar"): só aquela metade da voz descansa; o texto segue."""
    cache.set(f"{CHAVE_DISJUNTOR}:{funcao}", True, timeout=DISJUNTOR_SEGUNDOS)


def voz_bloqueada(funcao: str) -> str | None:
    """Motivo para recusar ouvir/falar antes de chamar o fornecedor, ou None. O teto é o do sistema."""
    if cache.get(CHAVE_DISJUNTOR) or cache.get(f"{CHAVE_DISJUNTOR}:{funcao}"):
        return "indisponivel"
    if perguntas_hoje("sistema") >= CANAIS["sistema"].limite_diario:
        return "orcamento_diario"
    return None


def estado(canal: str = "publico") -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"disponivel": False, "motivo": "sem_chave"}
    if cache.get(CHAVE_DISJUNTOR):
        return {"disponivel": False, "motivo": "indisponivel"}
    if perguntas_hoje(canal) >= CANAIS[canal].limite_diario:
        return {"disponivel": False, "motivo": "orcamento_diario"}
    return {"disponivel": True, "motivo": None}
