"""RAG do Zétele: cada canal (site público e área do sistema) tem a própria base e o próprio índice."""

from functools import cache
from pathlib import Path

from zetele.rag.documentos import Trecho, carregar
from zetele.rag.recuperador import Recuperador, RecuperadorLexico

PASTA_CONHECIMENTO = Path(__file__).resolve().parent.parent / "conhecimento"

__all__ = ["PASTA_CONHECIMENTO", "Recuperador", "Trecho", "recuperador_do_canal"]


@cache
def recuperador_do_canal(canal: str) -> Recuperador:
    """Índice montado uma vez por processo; a base muda só com deploy."""
    pasta = PASTA_CONHECIMENTO / canal
    trechos = carregar(pasta)
    if not trechos:
        raise RuntimeError(f"Base de conhecimento vazia: {pasta}")
    return RecuperadorLexico(trechos)
