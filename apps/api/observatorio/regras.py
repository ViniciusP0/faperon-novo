"""Textos do Observatório por regras determinísticas (ADR 0007): mesma entrada, mesmo texto."""

from decimal import Decimal

from analise.regras import classificar_concentracao, formatar_numero
from observatorio.calculos import Decomposicao

LIMIAR_ESTABILIDADE_PP = Decimal(1)
NOMES_METRICA = {
    "valor": "do valor da produção",
    "area": "da área colhida",
    "rebanho": "do rebanho bovino",
    "dominante": "do valor da produção",
}
AVISO_SEM_CARNE = (
    "O valor da produção soma lavouras (PAM) e produtos de origem animal (PPM); "
    "não inclui carne bovina nem abate, que a PPM não publica."
)
AVISO_SEM_DADOS = "Não há dados publicados pelo IBGE para este recorte."


def _pct(v: Decimal, sinal: bool = False) -> str:
    prefixo = "+" if sinal and v > 0 else ""
    return f"{prefixo}{formatar_numero(v, 1)}%"


def _pp(v: Decimal) -> str:
    return f"{'+' if v > 0 else ''}{formatar_numero(v, 1)} p.p."


def manchete_panorama(
    ano: int,
    ano_ref: int,
    lider: str,
    participacao: Decimal,
    delta_pp: Decimal | None,
    maior_delta_pp: Decimal | None,
) -> str:
    base = f"Em {ano}, {lider} respondeu por {_pct(participacao)} do valor da produção agropecuária de Rondônia"
    if maior_delta_pp is not None and abs(maior_delta_pp) < LIMIAR_ESTABILIDADE_PP:
        return base + "; a composição ficou estável no período (nenhum item variou 1 p.p. ou mais)."
    if delta_pp is None:
        return base + "."
    return base + f", {_pp(delta_pp)} em relação ao início do período."


def manchete_crescimento(cultura: str, inicio: int, fim: int, d: Decomposicao | None) -> str:
    if d is None:
        return (
            f"Não há base de comparação para {cultura} entre {inicio} e {fim}: "
            "falta área colhida ou produção em um dos anos."
        )
    if d.estavel or d.parte_area_pct is None or d.parte_rendimento_pct is None:
        return f"A produção de {cultura} ficou estável entre {inicio} e {fim}."
    area, rend = d.parte_area_pct, d.parte_rendimento_pct
    cresceu = d.variacao_producao_pct > 0
    abertura = (
        f"A produção de {cultura} {'cresceu' if cresceu else 'caiu'} "
        f"{_pct(abs(d.variacao_producao_pct))} entre {inicio} e {fim}"
    )
    if rend < 0 or area < 0:
        # Forças opostas: as partes saem de [0, 100] e não cabem como percentuais.
        if cresceu:
            if rend < 0:
                return abertura + ", puxada pela expansão de área, enquanto a produtividade recuou."
            return abertura + ", puxada por ganho de produtividade, enquanto a área colhida recuou."
        if area < 0:
            return abertura + ": a queda de produtividade mais que compensou a expansão de área."
        return abertura + ": a redução de área mais que compensou o ganho de produtividade."
    if cresceu:
        return (
            abertura + f"; {_pct(rend)} desse aumento veio de ganho de produtividade "
            f"e {_pct(area)} de expansão de área."
        )
    causa = "queda de produtividade" if rend >= area else "redução de área"
    return abertura + f", puxada principalmente pela {causa}."


def manchete_territorio(
    metrica: str, ano: int, top5_pct: Decimal | None, polo: str | None, dependentes: int
) -> str:
    if top5_pct is None or polo is None:
        return AVISO_SEM_DADOS
    texto = (
        f"Em {ano}, os cinco maiores municípios concentraram {_pct(top5_pct)} {NOMES_METRICA[metrica]} "
        f"(concentração {classificar_concentracao(top5_pct)}); {polo} é o principal polo."
    )
    if dependentes:
        texto += (
            f" {dependentes} municípios dependem de uma só cultura para mais da metade do valor agrícola."
            if dependentes > 1
            else " 1 município depende de uma só cultura para mais da metade do valor agrícola."
        )
    return texto


def manchete_pecuaria(
    rebanho: str,
    inicio: int,
    fim: int,
    variacao_pct: Decimal | None,
    polo: str | None,
    var_produtividade_pct: Decimal | None,
) -> str:
    if variacao_pct is None or polo is None:
        return AVISO_SEM_DADOS
    verbo = "cresceu" if variacao_pct > 0 else "caiu" if variacao_pct < 0 else "ficou estável"
    texto = f"O rebanho {rebanho.lower()} {verbo}"
    if variacao_pct != 0:
        texto += f" {_pct(abs(variacao_pct))}"
    texto += f" entre {inicio} e {fim}; {polo} é o principal polo."
    if var_produtividade_pct is not None:
        texto += f" A produtividade do leite variou {_pct(var_produtividade_pct, sinal=True)} no período."
    return texto


def como_ler(bloco: str, ano_ref: int | None) -> list[str]:
    precos = f"a preços de {ano_ref}" if ano_ref else "sem correção monetária"
    if ano_ref:
        valores = (
            f"Os valores estão corrigidos pelo IPCA médio anual e expressos {precos}; "
            "assim, a variação mostrada é real, não efeito da inflação."
        )
    else:
        valores = (
            "Os valores são mostrados sem correção monetária, pois não há IPCA disponível para o período; "
            "a variação inclui o efeito da inflação."
        )
    textos = {
        "panorama": [
            valores,
            "O retângulo de cada item é proporcional à sua participação no valor total do ano. "
            "Mudanças de participação mostram para onde a economia agrícola do estado está se deslocando.",
        ],
        "crescimento": [
            "A produção cresce porque a área colhida aumenta, porque cada hectare rende mais, ou pelos dois. "
            "A decomposição separa as duas contribuições, que somam 100%.",
            "Crescimento puxado por produtividade indica ganho tecnológico; puxado por área, "
            "indica expansão da fronteira agrícola.",
            f"A perda de lavoura é a parte da área plantada que não foi colhida; o valor por hectare está {precos}.",
        ],
        "territorio": [
            "O mapa mostra onde a produção acontece. Cores mais escuras indicam valores maiores; "
            "municípios em cinza não têm dado publicado ou têm dado sigiloso.",
            "A concentração mede quanto do total está nos cinco maiores municípios. O índice HHI vai de 0 "
            "(produção espalhada) a 10.000 (tudo em um município).",
            "Município dependente é aquele em que uma única cultura passa de 50% do valor agrícola: "
            "uma quebra de safra ou de preço dessa cultura afeta toda a economia local.",
        ],
        "pecuaria": [
            "O efetivo é o número de cabeças em 31 de dezembro de cada ano, segundo a PPM do IBGE.",
            "A produtividade do leite é o volume anual dividido pelo número de vacas ordenhadas: "
            "mostra se o estado produz mais leite por animal, e não só com mais animais.",
        ],
    }
    return textos[bloco]


def aviso_ano_ref(pedido: int, usado: int) -> str:
    return f"O IPCA de {pedido} ainda não está fechado; os valores estão a preços de {usado}."


def aviso_inicio_recortado(pedido: int, usado: int) -> str:
    return (
        f"O período começa em {usado}: antes do Plano Real não há como corrigir valores pelo IPCA."
    )
