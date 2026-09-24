"""Regras puras do núcleo: sem banco, sem IBGE. Todo cálculo publicado passa por aqui."""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from decimal import Decimal

from indicadores.models import Agregacao, StatusValor

CEM = Decimal(100)


@dataclass(frozen=True)
class ItemRanking:
    codigo_ibge: str
    nome: str
    valor: Decimal | None
    status: str
    posicao: int | None
    percentual_total: Decimal | None


def total_soma(valores: Iterable[Decimal | None]) -> Decimal | None:
    ok = [v for v in valores if v is not None]
    return sum(ok, Decimal(0)) if ok else None


def media_ponderada(pares: Iterable[tuple[Decimal, Decimal]]) -> Decimal | None:
    """Média de `valor` ponderada por `peso`. Pesos zero ou negativos são ignorados."""
    soma_pesos = Decimal(0)
    soma_produtos = Decimal(0)
    for valor, peso in pares:
        if peso > 0:
            soma_pesos += peso
            soma_produtos += valor * peso
    return soma_produtos / soma_pesos if soma_pesos > 0 else None


def total_por_regra(
    agregacao: str,
    valores: Sequence[Decimal | None],
    pares_ponderados: Iterable[tuple[Decimal, Decimal]] = (),
) -> Decimal | None:
    """Total estadual segundo a regra do indicador; rendimento nunca é somado."""
    if agregacao == Agregacao.SOMA:
        return total_soma(valores)
    if agregacao == Agregacao.MEDIA_PONDERADA:
        return media_ponderada(pares_ponderados)
    return None


def percentual(valor: Decimal | None, total: Decimal | None) -> Decimal | None:
    if valor is None or total is None or total <= 0:
        return None
    return valor / total * CEM


def montar_ranking(
    municipios: Iterable[tuple[str, str]],
    medicoes: dict[str, tuple[Decimal | None, str]],
    total: Decimal | None,
    agregacao: str,
) -> list[ItemRanking]:
    """Ordena todos os municípios: ok por valor decrescente, depois sigiloso, depois inexistente.

    Desempate por código IBGE (determinístico). Sigiloso e ausente nunca viram zero.
    """
    grupos: dict[str, list[tuple[str, str, Decimal | None]]] = {
        StatusValor.OK: [],
        StatusValor.SIGILOSO: [],
        StatusValor.INEXISTENTE: [],
    }
    for codigo, nome in municipios:
        valor, status = medicoes.get(codigo, (None, StatusValor.INEXISTENTE))
        if status == StatusValor.OK and valor is None:
            status = StatusValor.INEXISTENTE
        grupos[status].append((codigo, nome, valor))

    itens: list[ItemRanking] = []
    ok = sorted(grupos[StatusValor.OK], key=lambda t: (-(t[2] or Decimal(0)), t[0]))
    for posicao, (codigo, nome, valor) in enumerate(ok, start=1):
        pct = percentual(valor, total) if agregacao == Agregacao.SOMA else None
        itens.append(ItemRanking(codigo, nome, valor, StatusValor.OK, posicao, pct))
    for status in (StatusValor.SIGILOSO, StatusValor.INEXISTENTE):
        for codigo, nome, _ in sorted(grupos[status], key=lambda t: t[0]):
            itens.append(ItemRanking(codigo, nome, None, status, None, None))
    return itens
