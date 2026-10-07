"""Monta cada bloco do Observatório: lê (leitura), calcula (calculos) e escreve (regras)."""

from decimal import Decimal
from typing import Any

from indicadores.catalogo import FONTES
from indicadores.erros import ConsultaInvalida
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
