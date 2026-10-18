"""Recuperador do RAG: escolhe, para cada pergunta, os trechos da base do canal que vão ao modelo."""

from typing import Protocol

from zetele.rag.documentos import Trecho
from zetele.rag.indice import IndiceBM25


class Recuperador(Protocol):
    def buscar(self, pergunta: str, pagina: str, limite: int) -> list[Trecho]: ...

    def texto_completo(self) -> str:
        """Toda a base do canal: a conferência aceita números e links que estejam nela."""
        ...


class RecuperadorLexico:
    """Trechos da página atual primeiro (a pessoa costuma perguntar sobre o que vê), depois os mais
    parecidos com a pergunta pelo BM25. Sem nenhum acerto, os trechos gerais do canal."""

    def __init__(self, trechos: list[Trecho]) -> None:
        self._trechos = trechos
        self._indice = IndiceBM25(trechos)

    def buscar(self, pergunta: str, pagina: str, limite: int) -> list[Trecho]:
        escolhidos: list[Trecho] = [t for t in self._trechos if t["rota"] == pagina][:limite]
        for _, trecho in self._indice.pontuar(pergunta):
            if len(escolhidos) >= limite:
                break
            if trecho not in escolhidos:
                escolhidos.append(trecho)
        if not escolhidos:
            escolhidos = [t for t in self._trechos if t["rota"] is None][:limite]
        return escolhidos

    def texto_completo(self) -> str:
        return "\n\n".join(f"{t['titulo']}\n{t['texto']}" for t in self._trechos)
