"""Documentos do RAG: cada canal tem a sua pasta de Markdown, lida e fatiada em trechos.

Formato: seções "## [/rota] Título" (ou "## [-] Título" sem página própria). Seção longa é fatiada
por parágrafo ou item de lista, e cada fatia leva o título e a rota da seção.
"""

import re
from pathlib import Path
from typing import TypedDict

RE_SECAO = re.compile(r"^## \[([^\]]*)\] (.+)$", re.MULTILINE)
# Uma fatia cabe folgada no contexto; seção curta vira um trecho só.
MAX_CARACTERES = 900


class Trecho(TypedDict):
    id: str
    fonte: str
    titulo: str
    rota: str | None
    texto: str


def ler_secoes(texto: str, fonte: str = "") -> list[Trecho]:
    marcas = list(RE_SECAO.finditer(texto))
    trechos: list[Trecho] = []
    for i, m in enumerate(marcas):
        fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(texto)
        rota = m.group(1).strip()
        trechos.append(
            Trecho(
                id=f"{fonte}#{i}",
                fonte=fonte,
                titulo=m.group(2).strip(),
                # "[-]" marca seção sem página própria
                rota=rota if rota.startswith("/") else None,
                texto=texto[m.end() : fim].strip(),
            )
        )
    return trechos


def fatiar(trecho: Trecho, limite: int = MAX_CARACTERES) -> list[Trecho]:
    if len(trecho["texto"]) <= limite:
        return [trecho]
    # parágrafos e itens de lista ("- ") são as unidades; nunca corta no meio de uma frase
    unidades = [u.strip() for u in re.split(r"\n\s*\n|\n(?=- )", trecho["texto"]) if u.strip()]
    fatias: list[str] = []
    atual = ""
    for u in unidades:
        if atual and len(atual) + len(u) + 1 > limite:
            fatias.append(atual)
            atual = u
        else:
            atual = f"{atual}\n{u}" if atual else u
    if atual:
        fatias.append(atual)
    return [
        Trecho(**{**trecho, "id": f"{trecho['id']}.{n}", "texto": f}) for n, f in enumerate(fatias)
    ]


def carregar(pasta: Path) -> list[Trecho]:
    """Todos os .md da pasta, em ordem de nome, já fatiados."""
    trechos: list[Trecho] = []
    for arquivo in sorted(pasta.glob("*.md")):
        for secao in ler_secoes(arquivo.read_text(encoding="utf-8"), fonte=arquivo.name):
            trechos.extend(fatiar(secao))
    return trechos
