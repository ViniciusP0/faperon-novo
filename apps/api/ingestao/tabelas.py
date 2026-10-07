"""Configuração das tabelas SIDRA ingeridas. Só a Ingestão conhece estes códigos."""

from dataclasses import dataclass

from indicadores.models import Segmento


@dataclass(frozen=True)
class TabelaSidra:
    codigo: int
    classificacao: int | None
    variaveis: tuple[str, ...]
    segmento: str
    # Tabela sem classificação de produto: vira um único produto com este (código, nome).
    categoria_unica: tuple[str, str] | None = None


TABELAS: dict[int, TabelaSidra] = {
    5457: TabelaSidra(5457, 782, ("8331", "216", "214", "112", "215"), Segmento.AGRICULTURA),
    3939: TabelaSidra(3939, 79, ("105",), Segmento.PECUARIA),
    74: TabelaSidra(74, 80, ("106", "215"), Segmento.PECUARIA),
    94: TabelaSidra(94, None, ("107",), Segmento.PECUARIA, ("107", "Vacas ordenhadas")),
}

# IPCA (série nacional mensal): não é uma TabelaSidra; tem carga própria (ingestao/servico_indice.py).
TABELA_IPCA = 1737
VARIAVEL_IPCA = "2266"  # número-índice, base dez/1993 = 100

# Categoria "Total" agrega todos os produtos; não é um produto do catálogo.
CATEGORIA_TOTAL = "0"
