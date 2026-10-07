"""Cálculos puros do Observatório: sem banco, sem IBGE. Sigiloso/ausente chega como None e nunca vira zero."""

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from decimal import Decimal

CEM = Decimal(100)
ANO_MINIMO_DEFLACAO = 1995  # o IPCA médio de 1994 mistura meses anteriores ao Real
LIMIAR_ESTAVEL_LN = 0.001
LIMIAR_DEPENDENCIA = Decimal(50)
DEMAIS = "demais"


def deflacionar(
    valor: Decimal | None, ano: int, ano_ref: int, indices: Mapping[int, Decimal]
) -> Decimal | None:
    if valor is None or ano < ANO_MINIMO_DEFLACAO or ano not in indices or ano_ref not in indices:
        return None
    return valor * indices[ano_ref] / indices[ano]


@dataclass(frozen=True)
class Decomposicao:
    variacao_producao_pct: Decimal
    parte_area_pct: Decimal | None
    parte_rendimento_pct: Decimal | None
    estavel: bool


def _positivos(*valores: Decimal | None) -> bool:
    return all(v is not None and v > 0 for v in valores)


def decompor_crescimento(
    area_ini: Decimal | None,
    area_fim: Decimal | None,
    prod_ini: Decimal | None,
    prod_fim: Decimal | None,
) -> Decomposicao | None:
    """ln(P1/P0) = ln(A1/A0) + ln(R1/R0), com R = P/A. As duas partes somam 100%."""
    if not _positivos(area_ini, area_fim, prod_ini, prod_fim):
        return None
    assert area_ini and area_fim and prod_ini and prod_fim
    variacao = (prod_fim - prod_ini) / prod_ini * CEM
    ln_p = math.log(prod_fim / prod_ini)
    if abs(ln_p) < LIMIAR_ESTAVEL_LN:
        return Decomposicao(variacao, None, None, True)
    parte_area = Decimal(str(math.log(area_fim / area_ini) / ln_p)) * CEM
    return Decomposicao(variacao, parte_area, CEM - parte_area, False)


def perda_lavoura(plantada: Decimal | None, colhida: Decimal | None) -> Decimal | None:
    if plantada is None or colhida is None or plantada <= 0:
        return None
    return (plantada - colhida) / plantada * CEM


def valor_por_hectare(valor_mil_reais: Decimal | None, area_ha: Decimal | None) -> Decimal | None:
    if valor_mil_reais is None or area_ha is None or area_ha <= 0:
        return None
    return valor_mil_reais * 1000 / area_ha


def participacoes(valores: Mapping[str, Decimal]) -> dict[str, Decimal]:
    total = sum(valores.values(), Decimal(0))
    if total <= 0:
        return {}
    return {k: v / total * CEM for k, v in valores.items()}


def hhi(valores: Mapping[str, Decimal]) -> Decimal | None:
    partes = participacoes(valores)
    return sum((p * p for p in partes.values()), Decimal(0)) if partes else None


def top_com_demais(valores: Mapping[str, Decimal], n: int = 8) -> list[tuple[str, Decimal]]:
    ordenados = sorted(valores.items(), key=lambda kv: (-kv[1], kv[0]))
    topo, resto = ordenados[:n], ordenados[n:]
    if resto:
        topo.append((DEMAIS, sum((v for _, v in resto), Decimal(0))))
    return topo


def cultura_dominante(valores: Mapping[str, Decimal]) -> str | None:
    if not valores:
        return None
    return min(valores.items(), key=lambda kv: (-kv[1], kv[0]))[0]


def dependencia(
    valores: Mapping[str, Decimal], limiar: Decimal = LIMIAR_DEPENDENCIA
) -> tuple[str, Decimal] | None:
    for chave, parte in participacoes(valores).items():
        if parte > limiar:
            return chave, parte
    return None


def somar_por_grupo(valores: Mapping[str, Decimal], grupo_de: Mapping[str, str]) -> dict[str, Decimal]:
    """Só para indicadores de soma (todas as métricas do Território são somas)."""
    saida: dict[str, Decimal] = {}
    for chave, valor in valores.items():
        grupo = grupo_de.get(chave, "")
        if grupo:
            saida[grupo] = saida.get(grupo, Decimal(0)) + valor
    return saida


def indice_base_100(serie: Sequence[tuple[int, Decimal | None]]) -> list[tuple[int, Decimal | None]]:
    base = serie[0][1] if serie else None
    if base is None or base <= 0:
        return [(ano, None) for ano, _ in serie]
    return [(ano, None if v is None else v / base * CEM) for ano, v in serie]


def produtividade_leite(mil_litros: Decimal | None, vacas: Decimal | None) -> Decimal | None:
    if mil_litros is None or vacas is None or vacas <= 0:
        return None
    return mil_litros * 1000 / vacas
