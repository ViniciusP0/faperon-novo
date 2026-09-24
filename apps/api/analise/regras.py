"""Regras determinísticas da análise estratégica (ADR 0007): mesma entrada, mesmo texto."""

from collections.abc import Sequence
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from indicadores.dominio import ItemRanking, percentual
from indicadores.models import Agregacao, StatusValor

LIMIAR_CONCENTRACAO_ALTA = Decimal(70)
LIMIAR_CONCENTRACAO_MODERADA = Decimal(40)
LIMIAR_ESTABILIDADE = Decimal("0.05")  # em pontos percentuais


@dataclass(frozen=True)
class TopMunicipio:
    codigo_ibge: str
    nome: str
    valor: Decimal
    percentual: Decimal | None


@dataclass(frozen=True)
class Metricas:
    variacao_absoluta: Decimal | None = None
    variacao_percentual: Decimal | None = None
    cagr_percentual: float | None = None
    ano_inicial: int | None = None
    ano_final: int | None = None
    valor_inicial: Decimal | None = None
    valor_final: Decimal | None = None
    maior_ano: tuple[int, Decimal] | None = None
    menor_ano: tuple[int, Decimal] | None = None
    top5: list[TopMunicipio] = field(default_factory=list)
    concentracao_top5_percentual: Decimal | None = None


@dataclass(frozen=True)
class Contexto:
    produto: str
    indicador: str
    unidade: str
    escopo: str
    inicio: int
    fim: int


def formatar_numero(valor: Decimal | float, casas: int | None = None) -> str:
    """Formato pt-BR: milhar com ponto, decimal com vírgula."""
    v = Decimal(str(valor))
    if casas is None:
        casas = 0 if v == v.to_integral_value() or abs(v) >= 1000 else 2
    v = v.quantize(Decimal(1).scaleb(-casas), rounding=ROUND_HALF_UP)
    texto = f"{v:,.{casas}f}"
    return texto.replace(",", "#").replace(".", ",").replace("#", ".")


def calcular_cagr(inicial: Decimal, final: Decimal, anos: int) -> float | None:
    if inicial <= 0 or final <= 0 or anos <= 0:
        return None
    return ((float(final) / float(inicial)) ** (1 / anos) - 1) * 100


def calcular_metricas(
    pontos: Sequence[tuple[int, Decimal | None]],
    ranking: Sequence[ItemRanking],
    total: Decimal | None,
    agregacao: str,
) -> Metricas:
    validos = sorted((a, v) for a, v in pontos if v is not None)
    top = [
        TopMunicipio(i.codigo_ibge, i.nome, i.valor, i.percentual_total)
        for i in ranking
        if i.status == StatusValor.OK and i.valor is not None
    ][:5]
    concentracao: Decimal | None = None
    if agregacao == Agregacao.SOMA and top:
        concentracao = percentual(sum((t.valor for t in top), Decimal(0)), total)

    if not validos:
        return Metricas(top5=top, concentracao_top5_percentual=concentracao)

    ano_i, valor_i = validos[0]
    ano_f, valor_f = validos[-1]
    variacao_abs = valor_f - valor_i if ano_f != ano_i else None
    variacao_pct: Decimal | None = None
    if variacao_abs is not None and valor_i != 0:
        variacao_pct = variacao_abs / abs(valor_i) * 100
    cagr = calcular_cagr(valor_i, valor_f, ano_f - ano_i) if ano_f != ano_i else None
    maior = max(validos, key=lambda p: (p[1], -p[0]))
    menor = min(validos, key=lambda p: (p[1], p[0]))
    return Metricas(
        variacao_absoluta=variacao_abs,
        variacao_percentual=variacao_pct,
        cagr_percentual=cagr,
        ano_inicial=ano_i,
        ano_final=ano_f,
        valor_inicial=valor_i,
        valor_final=valor_f,
        maior_ano=maior,
        menor_ano=menor,
        top5=top,
        concentracao_top5_percentual=concentracao,
    )


def classificar_concentracao(pct: Decimal) -> str:
    if pct >= LIMIAR_CONCENTRACAO_ALTA:
        return "alta"
    if pct >= LIMIAR_CONCENTRACAO_MODERADA:
        return "moderada"
    return "baixa"


def _sinal(valor: Decimal) -> str:
    return "+" if valor > 0 else ""


def gerar_titulo(ctx: Contexto) -> str:
    base = f"{ctx.produto} — {ctx.indicador}, {ctx.inicio}–{ctx.fim}"
    return base if ctx.escopo == "Rondônia" else f"{base} ({ctx.escopo})"


def gerar_paragrafos(ctx: Contexto, m: Metricas) -> list[str]:
    indicador = ctx.indicador[:1].lower() + ctx.indicador[1:]
    u = ctx.unidade
    paragrafos: list[str] = []

    if m.valor_inicial is None or m.valor_final is None:
        paragrafos.append(
            f"Não há dados publicados de {indicador} de {ctx.produto} em {ctx.escopo} "
            f"entre {ctx.inicio} e {ctx.fim}."
        )
    elif m.ano_inicial == m.ano_final:
        paragrafos.append(
            f"Em {ctx.escopo}, o único ano com dados de {indicador} de {ctx.produto} no período "
            f"é {m.ano_final}: {formatar_numero(m.valor_final)} {u}."
        )
    else:
        assert m.variacao_absoluta is not None
        ini = f"{formatar_numero(m.valor_inicial)} {u} em {m.ano_inicial}"
        fim = f"{formatar_numero(m.valor_final)} {u} em {m.ano_final}"
        if m.variacao_percentual is None:
            resumo = f"uma variação de {_sinal(m.variacao_absoluta)}{formatar_numero(m.variacao_absoluta)} {u}"
        else:
            pct = m.variacao_percentual
            if abs(pct) < LIMIAR_ESTABILIDADE:
                direcao = "estabilidade"
            elif pct > 0:
                direcao = "um crescimento"
            else:
                direcao = "uma queda"
            resumo = (
                f"{direcao} de {formatar_numero(abs(pct), 1)}% "
                f"({_sinal(m.variacao_absoluta)}{formatar_numero(m.variacao_absoluta)} {u})"
            )
            if direcao == "estabilidade":
                resumo = f"estabilidade ({formatar_numero(pct, 1)}%)"
        paragrafos.append(
            f"Em {ctx.escopo}, {indicador} de {ctx.produto} passou de {ini} para {fim}, {resumo}."
        )
        if m.cagr_percentual is not None:
            paragrafos.append(
                "A taxa média de crescimento anual composta (CAGR) no período foi de "
                f"{_sinal(Decimal(m.cagr_percentual))}{formatar_numero(m.cagr_percentual, 1)}% ao ano."
            )
        if m.maior_ano and m.menor_ano and m.maior_ano[0] != m.menor_ano[0]:
            paragrafos.append(
                f"O maior valor da série foi {formatar_numero(m.maior_ano[1])} {u} em {m.maior_ano[0]}; "
                f"o menor foi {formatar_numero(m.menor_ano[1])} {u} em {m.menor_ano[0]}."
            )

    if m.top5:
        itens = []
        for t in m.top5:
            parte = f"{t.nome} ({formatar_numero(t.valor)} {u}"
            if t.percentual is not None:
                parte += f", {formatar_numero(t.percentual, 1)}% do total"
            itens.append(parte + ")")
        quantidade = (
            "cinco maiores municípios"
            if len(m.top5) == 5
            else f"{len(m.top5)} municípios com dados"
        )
        paragrafos.append(f"Em {ctx.fim}, os {quantidade} foram: {'; '.join(itens)}.")
        if m.concentracao_top5_percentual is not None:
            conc = m.concentracao_top5_percentual
            paragrafos.append(
                f"Juntos, os cinco maiores respondem por {formatar_numero(conc, 1)}% do total estadual, "
                f"o que indica concentração {classificar_concentracao(conc)} da produção."
            )
    return paragrafos
