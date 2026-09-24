"""Monta dicionários de resposta a partir dos objetos de serviço."""

from decimal import Decimal
from typing import Any

from indicadores import servicos
from indicadores.models import Municipio, Produto
from indicadores.servicos import Ponto, Recorte, formatar_data


def arredondar(valor: Decimal | float | None, casas: int = 2) -> float | None:
    return None if valor is None else round(float(valor), casas)


def ref_produto(p: Produto) -> dict[str, Any]:
    return {"slug": p.slug, "nome": p.nome, "segmento": p.segmento}


def ref_indicador(recorte: Recorte) -> dict[str, Any]:
    i = recorte.indicador
    return {
        "slug": i.slug,
        "nome": i.nome,
        "unidade": recorte.unidade,
        "agregacao": i.agregacao,
    }


def ref_municipio(m: Municipio | None) -> dict[str, Any] | None:
    return None if m is None else {"codigo_ibge": m.codigo_ibge, "nome": m.nome}


def pontos(lista: list[Ponto]) -> list[dict[str, Any]]:
    return [{"ano": p.ano, "valor": p.valor, "status": p.status} for p in lista]


def meta(tabela: int) -> dict[str, Any]:
    dados = servicos.meta_da_tabela(tabela)
    dados["atualizado_em"] = formatar_data(dados["atualizado_em"])
    return dados
