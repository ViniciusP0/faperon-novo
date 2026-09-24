"""Catálogo estático de Indicadores e Fontes. Produtos NÃO ficam aqui: vêm do que o IBGE publica."""

from dataclasses import dataclass

from indicadores.models import Agregacao


@dataclass(frozen=True)
class DefinicaoIndicador:
    codigo_ibge: str
    slug: str
    nome: str
    agregacao: str


INDICADORES: dict[str, DefinicaoIndicador] = {
    d.codigo_ibge: d
    for d in [
        DefinicaoIndicador("8331", "area-plantada", "Área plantada", Agregacao.SOMA),
        DefinicaoIndicador("216", "area-colhida", "Área colhida", Agregacao.SOMA),
        DefinicaoIndicador("214", "quantidade-produzida", "Quantidade produzida", Agregacao.SOMA),
        DefinicaoIndicador(
            "112", "rendimento-medio", "Rendimento médio", Agregacao.MEDIA_PONDERADA
        ),
        DefinicaoIndicador("215", "valor-da-producao", "Valor da produção", Agregacao.SOMA),
        DefinicaoIndicador("105", "efetivo", "Efetivo dos rebanhos", Agregacao.SOMA),
        DefinicaoIndicador(
            "106", "producao-de-origem-animal", "Produção de origem animal", Agregacao.SOMA
        ),
    ]
}

# Indicador usado como peso ao calcular a média ponderada de outro indicador.
PESO_DA_MEDIA: dict[str, str] = {"rendimento-medio": "area-colhida"}

UNIDADE_VALOR_PRODUCAO = "Mil Reais"

# O SIDRA devolve unidade vazia para algumas variáveis (ex.: área plantada); usa-se a dos metadados.
UNIDADES_PADRAO: dict[str, str] = {
    "8331": "Hectares",
    "216": "Hectares",
    "214": "Toneladas",
    "112": "Quilogramas por Hectare",
    "105": "Cabeças",
}
ANO_MINIMO_VALOR_PRODUCAO = 1994


@dataclass(frozen=True)
class Fonte:
    nome: str
    tabela_sidra: int
    url: str


FONTES: dict[int, Fonte] = {
    5457: Fonte(
        "IBGE – Pesquisa Agrícola Municipal (PAM)", 5457, "https://sidra.ibge.gov.br/Tabela/5457"
    ),
    3939: Fonte(
        "IBGE – Pesquisa da Pecuária Municipal (PPM)", 3939, "https://sidra.ibge.gov.br/Tabela/3939"
    ),
    74: Fonte(
        "IBGE – Pesquisa da Pecuária Municipal (PPM)", 74, "https://sidra.ibge.gov.br/tabela/74"
    ),
}
