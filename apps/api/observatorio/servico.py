"""Monta cada bloco do Observatório: lê (leitura), calcula (calculos) e escreve (regras)."""

from decimal import Decimal
from typing import Any

from indicadores.catalogo import FONTES
from indicadores.servicos import formatar_data
from observatorio import leitura
from observatorio import regras as r


def referencia_monetaria(ano: int, indices: dict[int, Decimal]) -> tuple[int | None, list[str]]:
    if not indices:
        return None, []
    if ano in indices:
        return ano, []
    anteriores = [a for a in indices if a <= ano]
    usado = max(anteriores) if anteriores else max(indices)
    return usado, [r.aviso_ano_ref(ano, usado)]


def meta(tabelas: list[int]) -> dict[str, Any]:
    return {
        "fontes": [
            {"fonte": FONTES[t].nome, "tabela_sidra": t, "url_fonte": FONTES[t].url}
            for t in tabelas
        ],
        "atualizado_em": formatar_data(leitura.atualizado_em(tabelas)),
    }


def f(valor: Decimal | None, casas: int = 2) -> float | None:
    """Decimal → float arredondado para a resposta (None continua None)."""
    return None if valor is None else round(float(valor), casas)
