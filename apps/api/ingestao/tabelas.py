"""Configuração das tabelas SIDRA ingeridas. Só a Ingestão conhece estes códigos."""

from dataclasses import dataclass

from indicadores.models import Segmento


@dataclass(frozen=True)
class TabelaSidra:
    codigo: int
    classificacao: int
    variaveis: tuple[str, ...]
    segmento: str


TABELAS: dict[int, TabelaSidra] = {
    5457: TabelaSidra(5457, 782, ("8331", "216", "214", "112", "215"), Segmento.AGRICULTURA),
    3939: TabelaSidra(3939, 79, ("105",), Segmento.PECUARIA),
    74: TabelaSidra(74, 80, ("106", "215"), Segmento.PECUARIA),
}

# Categoria "Total" agrega todos os produtos; não é um produto do catálogo.
CATEGORIA_TOTAL = "0"
