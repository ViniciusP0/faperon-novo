from dataclasses import dataclass
from datetime import date
from typing import Literal


@dataclass(frozen=True)
class AtoBruto:
    """Ato como veio da fonte (DOU ou DOE-RO), antes da triagem."""

    fonte: Literal["dou", "doe"]
    id_externo: str
    dia: date
    edicao: str
    secao: str
    orgao: str
    titulo: str
    texto: str
    url: str
    pagina: int | None = None


@dataclass(frozen=True)
class Veredito:
    """Resultado da triagem de um ato pelo modelo."""

    id_externo: str
    relevante: bool
    pontuacao: int
    rondonia: bool
    titulo_chave: str
    resumo: str
