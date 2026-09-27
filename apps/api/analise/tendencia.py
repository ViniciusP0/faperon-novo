"""Linha de tendência: regressão linear por mínimos quadrados sobre os anos com dado publicado."""

from collections.abc import Sequence
from dataclasses import dataclass

from analise.regras import formatar_numero


@dataclass(frozen=True)
class Tendencia:
    inclinacao: float  # variação média por ano, na unidade do indicador
    intercepto: float
    ano_base: int
    valores: list[float]  # valor da reta em cada ano informado
    r2: float  # quanto da variação da série a reta explica (0 a 1)


def tendencia_linear(anos: Sequence[int], valores: Sequence[float | None]) -> Tendencia | None:
    """Anos sem valor (sigilosos ou inexistentes) ficam fora do ajuste; nunca entram como zero."""
    pares = [(a, v) for a, v in zip(anos, valores, strict=True) if v is not None]
    if len(pares) < 2:
        return None
    ano_base = pares[0][0]
    xs = [float(a - ano_base) for a, _ in pares]
    ys = [v for _, v in pares]
    n = len(pares)
    media_x = sum(xs) / n
    media_y = sum(ys) / n
    sxx = sum((x - media_x) ** 2 for x in xs)
    if sxx == 0:
        return None
    inclinacao = sum((x - media_x) * (y - media_y) for x, y in zip(xs, ys, strict=True)) / sxx
    intercepto = media_y - inclinacao * media_x
    ss_res = sum((y - (inclinacao * x + intercepto)) ** 2 for x, y in zip(xs, ys, strict=True))
    ss_tot = sum((y - media_y) ** 2 for y in ys)
    r2 = 1.0 if ss_tot == 0 else max(0.0, 1 - ss_res / ss_tot)
    return Tendencia(
        inclinacao=inclinacao,
        intercepto=intercepto,
        ano_base=ano_base,
        valores=[inclinacao * (a - ano_base) + intercepto for a in anos],
        r2=r2,
    )


def descrever_tendencia(t: Tendencia, unidade: str) -> str:
    prefixo = "Linha de tendência (regressão linear pelos anos com dado):"
    r2 = formatar_numero(t.r2, 2)
    if abs(t.inclinacao) < 1e-9:
        return f"{prefixo} estável, sem variação média por ano (R² = {r2})."
    sinal, tipo = ("+", "crescimento médio") if t.inclinacao > 0 else ("−", "queda média")
    return (
        f"{prefixo} {tipo} de {sinal}{formatar_numero(round(abs(t.inclinacao), 6))} "
        f"{unidade.lower()} por ano (R² = {r2})."
    )
