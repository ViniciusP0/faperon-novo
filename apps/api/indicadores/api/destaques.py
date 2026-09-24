"""Indicadores em destaque na home: resumo de cada recorte (total, tendência e líderes)."""

from typing import Any

from indicadores import servicos
from indicadores.api import apresentacao as ap
from indicadores.erros import NaoEncontrado
from indicadores.models import StatusValor

DESTAQUES: tuple[tuple[str, str, str, str], ...] = (
    ("soja", "Soja", "soja-em-grao", "quantidade-produzida"),
    ("milho", "Milho", "milho-em-grao", "quantidade-produzida"),
    ("cafe", "Café canéfora", "cafe-em-grao-canephora", "quantidade-produzida"),
    ("cacau", "Cacau", "cacau-em-amendoa", "quantidade-produzida"),
    ("bovino", "Rebanho bovino", "bovino", "efetivo"),
    ("leite", "Leite", "leite", "producao-de-origem-animal"),
)
TOP = 5


def _variacao(pontos: list[dict[str, Any]]) -> float | None:
    valores = [p["valor"] for p in pontos if p["valor"] is not None]
    if len(valores) < 2 or not valores[0]:
        return None
    return ap.arredondar((valores[-1] - valores[0]) / valores[0] * 100)


def montar_item(chave: str, rotulo: str, produto: str, indicador: str) -> dict[str, Any] | None:
    try:
        recorte = servicos.obter_recorte(produto, indicador)
    except NaoEncontrado:
        return None
    if servicos.anos_com_dados(recorte) is None:
        return None
    inicio, fim = servicos.resolver_periodo(recorte, None, None)
    resultado = servicos.ranking(recorte, inicio, fim)
    pontos = ap.pontos(servicos.serie(recorte, inicio, fim))
    lideres = [i for i in resultado["itens"] if i.status == StatusValor.OK][:TOP]
    return {
        "chave": chave,
        "rotulo": rotulo,
        "produto": ap.ref_produto(recorte.produto),
        "indicador": ap.ref_indicador(recorte),
        "ano_referencia": fim,
        "total": resultado["total_estadual"],
        "serie": pontos,
        "variacao_percentual": _variacao(pontos),
        "top": [
            {
                "municipio": {"codigo_ibge": i.codigo_ibge, "nome": i.nome},
                "valor": i.valor,
                "percentual_total": ap.arredondar(i.percentual_total),
            }
            for i in lideres
        ],
        "meta": ap.meta(recorte.produto.tabela_origem),
    }


def montar_destaques() -> dict[str, Any]:
    itens = [item for d in DESTAQUES if (item := montar_item(*d)) is not None]
    atualizados = [i["meta"]["atualizado_em"] for i in itens if i["meta"]["atualizado_em"]]
    return {"itens": itens, "meta": {"atualizado_em": max(atualizados) if atualizados else None}}
