"""Monta cada bloco do Observatório: lê (leitura), calcula (calculos) e escreve (regras)."""

from decimal import Decimal
from typing import Any

from indicadores.catalogo import FONTES
from indicadores.erros import ConsultaInvalida, NaoEncontrado
from indicadores.servicos import formatar_data
from observatorio import calculos as c
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


VALOR = "valor-da-producao"
TABELAS_VALOR = (5457, 74)
JANELAS = (5, 10, 20)


def _vazio(
    bloco: str,
    filtros: dict[str, Any],
    tabelas: list[int],
    ano_ref: int | None = None,
    motivo: str = r.AVISO_SEM_DADOS,
    avisos: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "filtros": filtros,
        "metricas": {},
        "series": {},
        "texto": {"manchete": motivo, "como_ler": r.como_ler(bloco, ano_ref)},
        "qualidade": {
            "municipios_sigilosos": 0,
            "ano_ref_monetario": ano_ref,
            "avisos": [*(avisos or []), motivo],
        },
        "meta": meta(tabelas),
    }


def _validar_ano(ano: int, disponiveis: list[int]) -> None:
    if ano not in disponiveis:
        raise ConsultaInvalida(
            f"Não há dados para {ano}",
            {"ano": f"use um ano entre {disponiveis[0]} e {disponiveis[-1]}"},
        )


def _soma_presentes(valores: list[Decimal | None]) -> float | None:
    """Soma só o que existe; sem nenhum valor o resultado é None, nunca zero."""
    presentes = [v for v in valores if v is not None]
    return f(sum(presentes, Decimal(0))) if presentes else None


def panorama(ano: int | None, janela: int) -> dict[str, Any]:
    tabelas = [5457, 74, 1737]
    anos = leitura.anos_disponiveis(VALOR, 5457)
    if not anos:
        filtros_vazios = {
            "valores": {"ano": None, "janela": janela, "inicio": None},
            "opcoes": {"anos": [], "janelas": list(JANELAS)},
        }
        return _vazio("panorama", filtros_vazios, tabelas)
    ano = anos[-1] if ano is None else ano
    _validar_ano(ano, anos)
    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(ano, indices)
    inicio = ano - janela + 1
    recortado = inicio < c.ANO_MINIMO_DEFLACAO
    if recortado:
        inicio = c.ANO_MINIMO_DEFLACAO
    filtros = {
        "valores": {"ano": ano, "janela": janela, "inicio": inicio},
        "opcoes": {"anos": anos, "janelas": list(JANELAS)},
    }
    if ano_ref is None:  # sem nenhum IPCA carregado não há valor real
        return _vazio("panorama", filtros, tabelas, None, r.AVISO_SEM_IPCA, avisos)
    avisos.insert(0, r.AVISO_SEM_CARNE)
    if recortado:
        avisos.append(r.aviso_inicio_recortado(ano - janela + 1, c.ANO_MINIMO_DEFLACAO))

    nomes: dict[str, str] = {}
    reais: dict[str, dict[int, Decimal]] = {}
    origem_animal: set[str] = set()
    for tabela in TABELAS_VALOR:
        nomes |= leitura.produtos(tabela)
        for slug, por_ano in leitura.totais_por_produto(VALOR, tabela, inicio, ano).items():
            reais[slug] = {
                a: v
                for a, valor in por_ano.items()
                if ano_ref is not None
                and (v := c.deflacionar(valor, a, ano_ref, indices)) is not None
            }
            if tabela == 74:
                origem_animal.add(slug)

    no_ano = {s: v[ano] for s, v in reais.items() if ano in v}
    no_inicio = {s: v[inicio] for s, v in reais.items() if inicio in v}
    if not no_ano:  # há dado bruto no ano (ele sai de anos), mas sem IPCA para corrigi-lo
        return _vazio("panorama", filtros, tabelas, ano_ref, r.AVISO_SEM_IPCA, avisos)
    total = sum(no_ano.values(), Decimal(0))
    total_ini = sum(no_inicio.values(), Decimal(0))
    partes = c.participacoes(no_ano)
    partes_ini = c.participacoes(no_inicio)
    topo = c.top_com_demais(no_ano)
    chaves_topo = [s for s, _ in topo if s != c.DEMAIS]

    def nome(slug: str) -> str:
        return "Demais produtos" if slug == c.DEMAIS else nomes[slug]

    composicao = [
        {"slug": s, "nome": nome(s), "valor": f(v), "participacao": f(v / total * 100, 1)}
        for s, v in topo
    ]
    anos_janela = list(range(inicio, ano + 1))
    evolucao_itens = [
        {"slug": s, "nome": nome(s), "valores": [f(reais[s].get(a)) for a in anos_janela]}
        for s in chaves_topo
    ]
    if any(s == c.DEMAIS for s, _ in topo):
        resto = [s for s in reais if s not in chaves_topo]
        evolucao_itens.append(
            {
                "slug": c.DEMAIS,
                "nome": nome(c.DEMAIS),
                "valores": [_soma_presentes([reais[s].get(a) for s in resto]) for a in anos_janela],
            }
        )

    lider = chaves_topo[0]
    deltas = {s: partes[s] - partes_ini[s] for s in partes if s in partes_ini}
    maior_delta = max(deltas.values(), key=abs) if deltas else None
    area = sum(leitura.por_municipio("area-colhida", 5457, ano).values(), Decimal(0))
    return {
        "filtros": filtros,
        "metricas": {
            "valor_total_real": f(total),
            "valor_lavouras_real": f(
                sum((v for s, v in no_ano.items() if s not in origem_animal), Decimal(0))
            ),
            "valor_origem_animal_real": f(
                sum((v for s, v in no_ano.items() if s in origem_animal), Decimal(0))
            ),
            "variacao_real_pct": f((total - total_ini) / total_ini * 100)
            if total_ini > 0
            else None,
            "area_colhida_ha": f(area, 0),
        },
        "series": {
            "composicao": composicao,
            "evolucao": {"anos": anos_janela, "itens": evolucao_itens},
        },
        "texto": {
            "manchete": r.manchete_panorama(
                ano, ano_ref or ano, nomes[lider], partes[lider], deltas.get(lider), maior_delta
            ),
            "como_ler": r.como_ler("panorama", ano_ref),
        },
        "qualidade": {
            "municipios_sigilosos": leitura.sigilosos(VALOR, 5457, ano),
            "ano_ref_monetario": ano_ref,
            "avisos": avisos,
        },
        "meta": meta(tabelas),
    }


AREA_MINIMA_RANKING = Decimal(1000)


def _perda_comum(plantada: dict[str, Decimal], colhida: dict[str, Decimal]) -> Decimal | None:
    """Perda só sobre municípios que têm área plantada E colhida (evita totais descasados)."""
    comuns = plantada.keys() & colhida.keys()
    if not comuns:
        return None
    return c.perda_lavoura(
        sum((plantada[m] for m in comuns), Decimal(0)),
        sum((colhida[m] for m in comuns), Decimal(0)),
    )


def _estadual(indicador: str, slug: str, inicio: int, fim: int) -> dict[int, Decimal]:
    return leitura.totais_por_produto(indicador, 5457, inicio, fim).get(slug, {})


def crescimento(cultura: str | None, inicio: int | None, fim: int | None) -> dict[str, Any]:
    tabelas = [5457, 1737]
    culturas = leitura.produtos(5457)
    anos = leitura.anos_disponiveis("area-colhida", 5457)
    opcoes = {"culturas": [{"slug": s, "nome": n} for s, n in culturas.items()], "anos": anos}
    if not anos or not culturas:
        vazios = {"valores": {"cultura": cultura, "inicio": inicio, "fim": fim}, "opcoes": opcoes}
        return _vazio("crescimento", vazios, tabelas)
    if cultura is None:
        valores = leitura.totais_por_produto(VALOR, 5457, anos[-1], anos[-1])
        cultura = (
            max(valores, key=lambda s: (valores[s].get(anos[-1], Decimal(0)), s))
            if valores
            else next(iter(culturas))
        )
    if cultura not in culturas:
        raise NaoEncontrado(f"Cultura '{cultura}' não existe")
    fim = fim if fim is not None else anos[-1]
    inicio = inicio if inicio is not None else fim - 9
    if inicio > fim:
        raise ConsultaInvalida(
            "O ano inicial não pode ser maior que o ano final", {"inicio": "maior que fim"}
        )
    filtros = {"valores": {"cultura": cultura, "inicio": inicio, "fim": fim}, "opcoes": opcoes}

    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(fim, indices)
    if ano_ref is None:  # só o R$/ha precisa do deflator; o resto do bloco segue normal
        avisos.append(r.AVISO_SEM_IPCA)

    area = _estadual("area-colhida", cultura, inicio, fim)
    producao = _estadual("quantidade-produzida", cultura, inicio, fim)
    anos_janela = list(range(inicio, fim + 1))
    rendimento = {a: producao[a] / area[a] for a in anos_janela if a in producao and area.get(a)}
    d = c.decompor_crescimento(
        area.get(inicio), area.get(fim), producao.get(inicio), producao.get(fim)
    )
    plant_mun = leitura.por_municipio_na_janela("area-plantada", 5457, cultura, inicio, fim)
    colh_mun = leitura.por_municipio_na_janela("area-colhida", 5457, cultura, inicio, fim)
    perdas = [(a, _perda_comum(plant_mun.get(a, {}), colh_mun.get(a, {}))) for a in anos_janela]
    perdas_ok = [p for _, p in perdas if p is not None]

    valores_fim = leitura.totais_por_produto(VALOR, 5457, fim, fim)
    areas_fim = leitura.totais_por_produto("area-colhida", 5457, fim, fim)
    rph: list[dict[str, Any]] = []
    for slug, nome in culturas.items():
        a = areas_fim.get(slug, {}).get(fim)
        if ano_ref is None or a is None or a < AREA_MINIMA_RANKING:
            continue
        real = c.deflacionar(valores_fim.get(slug, {}).get(fim), fim, ano_ref, indices)
        vph = c.valor_por_hectare(real, a)
        if vph is not None:
            rph.append({"slug": slug, "nome": nome, "valor": f(vph, 0), "participacao": None})
    rph.sort(key=lambda i: (-(i["valor"] or 0), i["slug"]))

    def serie_indice(dados: dict[int, Decimal]) -> list[float | None]:
        return [f(v) for _, v in c.indice_base_100([(a, dados.get(a)) for a in anos_janela])]

    media_perda = sum(perdas_ok, Decimal(0)) / len(perdas_ok) if perdas_ok else None
    return {
        "filtros": filtros,
        "metricas": {
            "variacao_producao_pct": f(d.variacao_producao_pct) if d else None,
            "parte_area_pct": f(d.parte_area_pct) if d else None,
            "parte_rendimento_pct": f(d.parte_rendimento_pct) if d else None,
            "perda_media_pct": f(media_perda),
            "perda_ultimo_ano_pct": f(perdas[-1][1]),
        },
        "series": {
            "indices": {
                "anos": anos_janela,
                "area": serie_indice(area),
                "rendimento": serie_indice(rendimento),
                "producao": serie_indice(producao),
            },
            "perda": [{"ano": a, "valor": f(p)} for a, p in perdas],
            "valor_por_hectare": rph,
        },
        "texto": {
            "manchete": r.manchete_crescimento(culturas[cultura], inicio, fim, d),
            "como_ler": r.como_ler("crescimento", ano_ref),
        },
        "qualidade": {
            "municipios_sigilosos": leitura.sigilosos("quantidade-produzida", 5457, fim, cultura),
            "ano_ref_monetario": ano_ref,
            "avisos": avisos,
        },
        "meta": meta(tabelas),
    }
