"""Índice lexical (BM25) em português: sem dependência externa e sem custo por consulta.

É o primeiro recuperador do RAG; o Protocol Recuperador deixa trocar por busca vetorial (pgvector,
com embeddings) sem mexer no agente.
"""

import math
import re
import unicodedata
from collections import Counter

from zetele.rag.documentos import Trecho

_STOPWORDS = """a ao aos as até com como da das de do dos e é ela ele em entre essa esse esta este eu
    foi há isso já la lá mais mas me meu minha na nas no nos o os ou para pela pelas pelo pelos
    por qual quando que quem se sem ser seu sua são também te tem ter um uma uns umas você vocês
    onde fica posso faço consigo como quero preciso sobre aqui"""
K1 = 1.5
B = 0.75
# O título resume a seção: conta em dobro.
PESO_TITULO = 2


def _sem_acento(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


# comparadas já sem acento, como as palavras do texto
STOPWORDS = frozenset(_sem_acento(_STOPWORDS).split())


def _radical(palavra: str) -> str:
    # radical grosseiro: plural e "ção/ções" ("reservas"→"reserva", "devoluções"→"devoluc")
    for sufixo in ("coes", "cao", "oes", "s"):
        if len(palavra) > len(sufixo) + 3 and palavra.endswith(sufixo):
            return palavra[: -len(sufixo)] + ("c" if sufixo in ("coes", "cao") else "")
    return palavra


def tokenizar(texto: str) -> list[str]:
    palavras = re.findall(r"\w+", _sem_acento(texto.casefold()))
    return [_radical(p) for p in palavras if p not in STOPWORDS and len(p) > 1]


class IndiceBM25:
    def __init__(self, trechos: list[Trecho]) -> None:
        self.trechos = trechos
        self._termos = [
            Counter(tokenizar(t["texto"]) + tokenizar(t["titulo"]) * PESO_TITULO) for t in trechos
        ]
        self._tamanhos = [sum(c.values()) for c in self._termos]
        self._media = (sum(self._tamanhos) / len(trechos)) if trechos else 0.0
        frequencia: Counter[str] = Counter()
        for c in self._termos:
            frequencia.update(c.keys())
        n = len(trechos)
        self._idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in frequencia.items()}

    def pontuar(self, consulta: str) -> list[tuple[float, Trecho]]:
        termos = set(tokenizar(consulta))
        resultado: list[tuple[float, Trecho]] = []
        for termos_doc, tamanho, trecho in zip(
            self._termos, self._tamanhos, self.trechos, strict=True
        ):
            nota = 0.0
            for termo in termos & termos_doc.keys():
                f = termos_doc[termo]
                nota += (
                    self._idf[termo] * f * (K1 + 1) / (f + K1 * (1 - B + B * tamanho / self._media))
                )
            if nota > 0:
                resultado.append((nota, trecho))
        # empate: ordem do arquivo, para o resultado ser estável
        resultado.sort(key=lambda par: -par[0])
        return resultado
