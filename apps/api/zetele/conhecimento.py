"""De onde o Zétele tira o que sabe sobre o site. Hoje: o site.md inteiro no prompt.

A interface já é a do RAG futuro (BaseVetorial com pgvector, BaseFaq): trocar a fonte não mexe no
agente nem no prompt.
"""

import re
from pathlib import Path
from typing import Protocol, TypedDict

ARQUIVO = Path(__file__).parent / "conhecimento" / "site.md"
RE_SECAO = re.compile(r"^## \[([^\]]*)\] (.+)$", re.MULTILINE)


class Trecho(TypedDict):
    titulo: str
    rota: str | None
    texto: str


class FonteDeConhecimento(Protocol):
    def trechos(self, pergunta: str, limite: int) -> list[Trecho]: ...


def ler_secoes(texto: str) -> list[Trecho]:
    marcas = list(RE_SECAO.finditer(texto))
    trechos: list[Trecho] = []
    for i, m in enumerate(marcas):
        fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(texto)
        rota = m.group(1).strip()
        trechos.append(
            Trecho(
                titulo=m.group(2).strip(),
                # "[-]" marca seção sem página própria
                rota=rota if rota.startswith("/") else None,
                texto=texto[m.end() : fim].strip(),
            )
        )
    return trechos


def texto_da_base() -> str:
    return ARQUIVO.read_text(encoding="utf-8")


class BaseEstatica:
    """Devolve todas as seções, na ordem do arquivo; ignora a pergunta."""

    def __init__(self, caminho: Path = ARQUIVO) -> None:
        self._trechos = ler_secoes(caminho.read_text(encoding="utf-8"))

    def trechos(self, pergunta: str, limite: int) -> list[Trecho]:
        return self._trechos[:limite]
