"""Voz do Zétele do sistema (ADR 0034): ouvir (áudio → texto) e falar (texto → áudio).

Cada fornecedor é uma classe atrás de Transcritor ou Sintetizador, escolhida por
ZETELE_OUVIR_PROVEDOR e ZETELE_FALAR_PROVEDOR. Trocar de fornecedor (OpenAI, por exemplo) é
acrescentar uma classe e uma linha nos dicionários abaixo, sem mexer nas views nem no front.
Sem a chave do fornecedor escolhido, aquela metade da voz fica desligada.
"""

from collections.abc import Callable
from typing import Protocol

from django.conf import settings

from zetele.audio.sintese import SintetizadorGemini
from zetele.audio.transcricao import TranscritorGroq


class Transcritor(Protocol):
    def transcrever(self, conteudo: bytes, nome: str, tipo: str) -> str: ...


class Sintetizador(Protocol):
    def sintetizar(self, texto: str) -> bytes: ...


# fornecedor → (ajuste com a chave, fábrica)
TRANSCRITORES: dict[str, tuple[str, Callable[[str], Transcritor]]] = {
    "groq": ("GROQ_API_KEY", lambda chave: TranscritorGroq(chave, settings.ZETELE_OUVIR_MODELO)),
}
SINTETIZADORES: dict[str, tuple[str, Callable[[str], Sintetizador]]] = {
    "gemini": (
        "GEMINI_API_KEY",
        lambda chave: SintetizadorGemini(
            chave, settings.ZETELE_FALAR_MODELO, settings.ZETELE_FALAR_VOZ
        ),
    ),
}


def obter_transcritor() -> Transcritor | None:
    item = TRANSCRITORES.get(settings.ZETELE_OUVIR_PROVEDOR)
    if item is None:
        return None
    ajuste, fabrica = item
    chave = str(getattr(settings, ajuste, ""))
    return fabrica(chave) if chave else None


def obter_sintetizador() -> Sintetizador | None:
    item = SINTETIZADORES.get(settings.ZETELE_FALAR_PROVEDOR)
    if item is None:
        return None
    ajuste, fabrica = item
    chave = str(getattr(settings, ajuste, ""))
    return fabrica(chave) if chave else None


def estado_voz() -> dict[str, bool]:
    """O que o front pode mostrar: o microfone (ouvir) e o botão Ouvir (falar)."""
    return {"ouvir": obter_transcritor() is not None, "falar": obter_sintetizador() is not None}
