"""Gráficos SVG de colunas gerados no servidor (usados no PDF)."""

import math
from collections.abc import Sequence
from html import escape

from analise.regras import formatar_numero

PALETA = ["#2E7D32", "#B7791F", "#1B6E8C", "#8E3B5B", "#5C6B2F"]
COR_TENDENCIA = "#B45309"
NOME_TENDENCIA = "Tendência linear"
FONTE = "DejaVu Sans, Arial, sans-serif"


def _teto(maximo: float) -> float:
    """Topo do eixo: 4 intervalos de passo "redondo" que cobrem o máximo."""
    if maximo <= 0:
        return 1.0
    bruto = maximo / 4
    expoente = math.floor(math.log10(bruto))
    for base in (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10):
        passo = base * 10**expoente
        if passo >= bruto:
            return float(passo * 4)
    return float(10 ** (expoente + 1) * 4)


def _rotulo_eixo(valor: float) -> str:
    if valor >= 1_000_000:
        return formatar_numero(valor / 1_000_000, 1) + " mi"
    if valor >= 10_000:
        return formatar_numero(valor / 1_000, 0) + " mil"
    return formatar_numero(valor, 0 if valor == int(valor) else 1)


def grafico_colunas(
    anos: Sequence[int],
    series: Sequence[tuple[str, Sequence[float | None]]],
    largura: int = 680,
    altura: int = 260,
    tendencia: Sequence[float] | None = None,
) -> str:
    """Colunas agrupadas: uma série = colunas simples; várias = agrupadas com legenda.

    `tendencia` (um valor por ano) desenha a linha tracejada de tendência linear sobre as colunas.
    """
    margem_esq, margem_dir, margem_top, margem_base = 62, 12, 14, 30
    legenda = len(series) > 1 or tendencia is not None
    if legenda:
        margem_base += 22
    area_w = largura - margem_esq - margem_dir
    area_h = altura - margem_top - margem_base
    maximo = max((v for _, valores in series for v in valores if v is not None), default=0.0)
    if tendencia:
        maximo = max(maximo, *tendencia)
    teto = _teto(maximo)
    grupo_w = area_w / max(len(anos), 1)
    col_w = max(grupo_w * 0.7 / len(series), 1.5)
    passo_rotulo = max(math.ceil(len(anos) / 12), 1)

    p: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largura} {altura}" '
        f'width="{largura}" height="{altura}" font-family="{FONTE}" font-size="10">'
    ]
    for i in range(5):
        y = margem_top + area_h - area_h * i / 4
        p.append(
            f'<line x1="{margem_esq}" y1="{y:.1f}" x2="{largura - margem_dir}" y2="{y:.1f}" '
            'stroke="#D9D9D9" stroke-width="0.7"/>'
        )
        p.append(
            f'<text x="{margem_esq - 6}" y="{y + 3:.1f}" text-anchor="end" fill="#555">'
            f"{escape(_rotulo_eixo(teto * i / 4))}</text>"
        )
    for gi, ano in enumerate(anos):
        x0 = margem_esq + gi * grupo_w + (grupo_w - col_w * len(series)) / 2
        for si, (_, valores) in enumerate(series):
            valor = valores[gi]
            if valor is None:
                continue
            h = area_h * valor / teto
            p.append(
                f'<rect x="{x0 + si * col_w:.1f}" y="{margem_top + area_h - h:.1f}" '
                f'width="{col_w:.1f}" height="{h:.1f}" fill="{PALETA[si % len(PALETA)]}"/>'
            )
        if gi % passo_rotulo == 0:
            p.append(
                f'<text x="{margem_esq + gi * grupo_w + grupo_w / 2:.1f}" '
                f'y="{margem_top + area_h + 14}" text-anchor="middle" fill="#555">{ano}</text>'
            )
    if tendencia:
        pontos = " ".join(
            f"{margem_esq + gi * grupo_w + grupo_w / 2:.1f},"
            f"{margem_top + area_h - area_h * min(max(v, 0.0), teto) / teto:.1f}"
            for gi, v in enumerate(tendencia)
        )
        p.append(
            f'<polyline points="{pontos}" fill="none" stroke="{COR_TENDENCIA}" stroke-width="2" '
            'stroke-dasharray="6 4" stroke-linejoin="round"/>'
        )
    if legenda:
        x = margem_esq
        y = altura - 8
        for si, (nome, _) in enumerate(series):
            p.append(
                f'<rect x="{x}" y="{y - 8}" width="9" height="9" fill="{PALETA[si % len(PALETA)]}"/>'
            )
            p.append(f'<text x="{x + 13}" y="{y}" fill="#333">{escape(nome)}</text>')
            x += 22 + int(len(nome) * 5.6)
        if tendencia:
            p.append(
                f'<line x1="{x}" y1="{y - 4}" x2="{x + 16}" y2="{y - 4}" stroke="{COR_TENDENCIA}" '
                'stroke-width="2" stroke-dasharray="6 4"/>'
            )
            p.append(f'<text x="{x + 21}" y="{y}" fill="#333">{NOME_TENDENCIA}</text>')
    p.append("</svg>")
    return "".join(p)
