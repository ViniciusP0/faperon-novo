"""Orquestra consultas do núcleo e aplica as regras de análise."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from analise import regras
from indicadores import servicos
from indicadores.dominio import ItemRanking
from indicadores.models import Municipio
from indicadores.servicos import Ponto, Recorte


@dataclass(frozen=True)
class ResultadoAnalise:
    recorte: Recorte
    inicio: int
    fim: int
    municipio: Municipio | None
    pontos: list[Ponto]
    ranking: list[ItemRanking]
    total_estadual: Decimal | None
    metricas: regras.Metricas
    titulo: str
    paragrafos: list[str]


def analisar(
    produto_slug: str,
    indicador_slug: str,
    inicio: int | None,
    fim: int | None,
    municipio_codigo: str | None = None,
) -> ResultadoAnalise:
    recorte = servicos.obter_recorte(produto_slug, indicador_slug)
    inicio, fim = servicos.resolver_periodo(recorte, inicio, fim)
    municipio = servicos.obter_municipio(municipio_codigo) if municipio_codigo else None
    pontos = servicos.serie(recorte, inicio, fim, municipio)
    resultado = servicos.ranking(recorte, inicio, fim)
    metricas = regras.calcular_metricas(
        [(p.ano, p.valor) for p in pontos],
        resultado["itens"],
        resultado["total_estadual"],
        recorte.indicador.agregacao,
    )
    ctx = regras.Contexto(
        produto=recorte.produto.nome,
        indicador=recorte.indicador.nome,
        unidade=recorte.unidade,
        escopo=municipio.nome if municipio else "Rondônia",
        inicio=inicio,
        fim=fim,
    )
    return ResultadoAnalise(
        recorte=recorte,
        inicio=inicio,
        fim=fim,
        municipio=municipio,
        pontos=pontos,
        ranking=resultado["itens"],
        total_estadual=resultado["total_estadual"],
        metricas=metricas,
        titulo=regras.gerar_titulo(ctx),
        paragrafos=regras.gerar_paragrafos(ctx, metricas),
    )


def _par(par: tuple[int, Decimal] | None) -> dict[str, Any] | None:
    return None if par is None else {"ano": par[0], "valor": par[1]}


def metricas_para_api(m: regras.Metricas) -> dict[str, Any]:
    arred = lambda v: None if v is None else round(float(v), 2)  # noqa: E731
    return {
        "variacao_absoluta": m.variacao_absoluta,
        "variacao_percentual": arred(m.variacao_percentual),
        "cagr_percentual": arred(m.cagr_percentual),
        "maior_ano": _par(m.maior_ano),
        "menor_ano": _par(m.menor_ano),
        "top5": [
            {
                "municipio": {"codigo_ibge": t.codigo_ibge, "nome": t.nome},
                "valor": t.valor,
                "percentual": arred(t.percentual),
            }
            for t in m.top5
        ],
        "concentracao_top5_percentual": arred(m.concentracao_top5_percentual),
    }
