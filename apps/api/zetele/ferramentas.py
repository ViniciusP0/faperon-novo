"""Ferramentas do Zétele: leem os mesmos serviços do Painel e do Observatório (ADR 0007/0029).

Todo número que o modelo pode citar sai daqui já formatado; a conferência compara o texto final
com estes resultados. `fontes` e `urls` são montados em código, nunca pelo modelo.
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

from analise import servico as analise_servico
from analise.regras import formatar_numero
from indicadores import servicos
from indicadores.erros import ConsultaInvalida, NaoEncontrado, RecorteIncompativel
from indicadores.models import StatusValor
from observatorio import servico as observatorio_servico

ROTA_OBSERVATORIO = "/central-de-inteligencia/observatorio"
# mesmos prefixos de apps/web/src/lib/observatorio-url.ts
PREFIXOS_OBSERVATORIO = {
    "panorama": "pan_",
    "crescimento": "cre_",
    "territorio": "ter_",
    "pecuaria": "pec_",
}
# filtros que cada bloco aceita, na ordem em que entram no link (a conferência compara a URL
# inteira, então a ordem precisa ser estável); filtro de outro bloco não vai para o link
FILTROS_OBSERVATORIO = {
    "panorama": ("ano", "janela"),
    "crescimento": ("cultura", "inicio", "fim"),
    "territorio": ("metrica", "cultura", "ano"),
    "pecuaria": ("rebanho", "inicio", "fim"),
}


class ErroDeFerramenta(Exception):
    """Erro que o modelo pode contornar (produto inexistente, período inválido)."""


@dataclass(frozen=True)
class ResultadoFerramenta:
    dados: dict[str, Any]
    fontes: list[dict[str, Any]]
    urls: frozenset[str]
    resumo: str


def _schema(propriedades: dict[str, Any], obrigatorios: list[str]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": propriedades,
        "required": obrigatorios,
        "additionalProperties": False,
    }


_PRODUTO = {"type": "string", "description": "slug do produto no catálogo, ex.: soja-em-grao"}
_INDICADOR = {
    "type": "string",
    "description": "slug do indicador no catálogo, ex.: quantidade-produzida",
}
_ANO = {"type": "integer", "description": "ano; omita para usar o mais recente com dados"}

DEFINICOES: list[dict[str, Any]] = [
    {
        "name": "ranking_municipios",
        "description": (
            "Ranking dos municípios de Rondônia em um produto e indicador do IBGE, com o total do "
            "estado, a fonte e o link do Painel. Use para 'qual município mais produz', 'quanto "
            "Rondônia produz', 'quantas cabeças de gado'."
        ),
        "strict": True,
        "input_schema": _schema(
            {
                "produto": _PRODUTO,
                "indicador": _INDICADOR,
                "ano": _ANO,
                "quantos": {"type": "integer", "enum": list(range(1, 11))},
            },
            ["produto", "indicador"],
        ),
    },
    {
        "name": "evolucao_e_analise",
        "description": (
            "Evolução de um produto e indicador no período (Rondônia ou um município) com a análise "
            "determinística do Painel: variação, crescimento médio anual, maior e menor ano."
        ),
        "strict": True,
        "input_schema": _schema(
            {
                "produto": _PRODUTO,
                "indicador": _INDICADOR,
                "inicio": _ANO,
                "fim": _ANO,
                "municipio": {"type": "string", "description": "código IBGE de 7 dígitos"},
            },
            ["produto", "indicador"],
        ),
    },
    {
        "name": "bloco_observatorio",
        "description": (
            "Conclusão (manchete) e métricas de um bloco do Observatório: panorama (tamanho e "
            "composição da produção), crescimento (por que cresceu), territorio (onde acontece) ou "
            "pecuaria. Valores em reais corrigidos pelo IPCA."
        ),
        "strict": True,
        "input_schema": _schema(
            {
                "bloco": {
                    "type": "string",
                    "enum": ["panorama", "crescimento", "territorio", "pecuaria"],
                },
                "ano": _ANO,
                "janela": {"type": "integer", "enum": [5, 10, 20]},
                "inicio": _ANO,
                "fim": _ANO,
                "cultura": {"type": "string", "description": "slug de uma lavoura"},
                "rebanho": {"type": "string", "description": "slug de um rebanho"},
                "metrica": {"type": "string", "enum": ["valor", "area", "rebanho", "dominante"]},
            },
            ["bloco"],
        ),
    },
    {
        "name": "valor_e_preco_medio",
        "description": (
            "Valor da produção (IBGE) de um produto em Rondônia e o preço médio implícito "
            "(valor da produção dividido pela quantidade). Use para perguntas de preço e de quanto "
            "vale a produção. Não é cotação de mercado do dia."
        ),
        "strict": True,
        "input_schema": _schema({"produto": _PRODUTO, "ano": _ANO}, ["produto"]),
    },
]

# Quantidade que divide o valor: lavouras têm quantidade produzida; leite, ovos e mel, produção
# de origem animal.
QUANTIDADES_PARA_PRECO = ("quantidade-produzida", "producao-de-origem-animal")
SINGULAR = {"Toneladas": "tonelada", "Mil frutos": "mil frutos", "Mil litros": "mil litros"}


def _fmt(valor: Any, casas: int | None = None) -> str | None:
    return None if valor is None else formatar_numero(valor, casas)


def _url_painel(**filtros: Any) -> str:
    # nomes lidos por parseFiltros (apps/web/src/lib/filters.ts); urlencode mantém a ordem
    return "/painel?" + urlencode({k: v for k, v in filtros.items() if v not in (None, "")})


def _fonte(tabela: int, ano: int | None, url_interna: str) -> dict[str, Any]:
    meta = servicos.meta_da_tabela(tabela)
    sufixo = f", ano {ano}" if ano else ""
    return {
        "rotulo": f"{meta['fonte']}, tabela {meta['tabela_sidra']}{sufixo}",
        "url_fonte": meta["url_fonte"],
        "url_interna": url_interna,
        "atualizado_em": servicos.formatar_data(meta["atualizado_em"]),
    }


def _ranking(e: dict[str, Any]) -> ResultadoFerramenta:
    recorte = servicos.obter_recorte(e["produto"], e["indicador"])
    inicio, fim = servicos.resolver_periodo(recorte, None, e.get("ano"))
    r = servicos.ranking(recorte, inicio, fim)
    quantos = min(max(int(e.get("quantos") or 5), 1), 10)
    ok = [i for i in r["itens"] if i.posicao is not None][:quantos]
    url = _url_painel(
        segmento=recorte.produto.segmento,
        produto=recorte.produto.slug,
        indicador=recorte.indicador.slug,
        fim=fim,
    )
    itens = [
        {
            "posicao": i.posicao,
            "municipio": i.nome,
            "codigo_ibge": i.codigo_ibge,
            "valor": i.valor,
            "valor_formatado": _fmt(i.valor),
            "percentual_formatado": _fmt(i.percentual_total, 1),
        }
        for i in ok
    ]
    fonte = _fonte(recorte.produto.tabela_origem, fim, url)
    dados = {
        "produto": recorte.produto.nome,
        "indicador": recorte.indicador.nome,
        "unidade": recorte.unidade,
        "ano_referencia": fim,
        "total_estadual": r["total_estadual"],
        "total_formatado": _fmt(r["total_estadual"]),
        "itens": itens,
        "municipios_sigilosos": sum(1 for i in r["itens"] if i.status == StatusValor.SIGILOSO),
        "fonte": fonte["rotulo"],
        "url_painel": url,
    }
    if itens:
        p = itens[0]
        pct = (
            f" ({p['percentual_formatado']}% do total de Rondônia)"
            if p["percentual_formatado"]
            else ""
        )
        resumo = (
            f"Em {fim}, o município com o maior valor de {recorte.indicador.nome.lower()} de "
            f"{recorte.produto.nome} foi {p['municipio']}, com {p['valor_formatado']} "
            f"({recorte.unidade.lower()}){pct}. Fonte: {fonte['rotulo']}."
        )
    else:
        resumo = f"Não há dados de {recorte.produto.nome} em {fim}. Veja o Painel Agro Analítico."
    return ResultadoFerramenta(dados, [fonte], frozenset({url}), resumo)


def _analise(e: dict[str, Any]) -> ResultadoFerramenta:
    r = analise_servico.analisar(
        e["produto"], e["indicador"], e.get("inicio"), e.get("fim"), e.get("municipio")
    )
    m = r.metricas
    url = _url_painel(
        segmento=r.recorte.produto.segmento,
        produto=r.recorte.produto.slug,
        indicador=r.recorte.indicador.slug,
        municipio=r.municipio.codigo_ibge if r.municipio else None,
        inicio=r.inicio,
        fim=r.fim,
        aba="analise",
    )
    fonte = _fonte(r.recorte.produto.tabela_origem, r.fim, url)
    dados = {
        "titulo": r.titulo,
        "paragrafos": r.paragrafos,
        "escopo": r.municipio.nome if r.municipio else "Rondônia",
        "unidade": r.recorte.unidade,
        "inicio": r.inicio,
        "fim": r.fim,
        "valor_inicial_formatado": _fmt(m.valor_inicial),
        "valor_final_formatado": _fmt(m.valor_final),
        "variacao_percentual_formatado": _fmt(m.variacao_percentual, 1),
        "cagr_percentual_formatado": _fmt(m.cagr_percentual, 1),
        "fonte": fonte["rotulo"],
        "url_painel": url,
    }
    resumo = r.paragrafos[0] if r.paragrafos else r.titulo
    return ResultadoFerramenta(dados, [fonte], frozenset({url}), resumo)


def _observatorio(e: dict[str, Any]) -> ResultadoFerramenta:
    bloco = e["bloco"]
    chamadas: dict[str, Callable[[], dict[str, Any]]] = {
        "panorama": lambda: observatorio_servico.panorama(e.get("ano"), int(e.get("janela") or 10)),
        "crescimento": lambda: observatorio_servico.crescimento(
            e.get("cultura"), e.get("inicio"), e.get("fim")
        ),
        "territorio": lambda: observatorio_servico.territorio(
            e.get("metrica") or "valor", e.get("cultura"), e.get("ano")
        ),
        "pecuaria": lambda: observatorio_servico.pecuaria(
            e.get("rebanho"), e.get("inicio"), e.get("fim")
        ),
    }
    if bloco not in chamadas:
        raise ErroDeFerramenta(f"Bloco '{bloco}' não existe")
    res = chamadas[bloco]()
    parametros = {
        PREFIXOS_OBSERVATORIO[bloco] + k: v
        for k in FILTROS_OBSERVATORIO[bloco]
        if (v := e.get(k)) not in (None, "")
    }
    url = ROTA_OBSERVATORIO + (f"?{urlencode(parametros)}" if parametros else "") + f"#{bloco}"
    meta = res["meta"]
    fontes = [
        {
            "rotulo": f"{f['fonte']}, tabela {f['tabela_sidra']}",
            "url_fonte": f["url_fonte"],
            "url_interna": url,
            "atualizado_em": meta.get("atualizado_em"),
        }
        for f in meta["fontes"]
    ]
    dados = {
        "bloco": bloco,
        "manchete": res["texto"]["manchete"],
        "como_ler": res["texto"]["como_ler"],
        "metricas": res["metricas"],
        "avisos": res["qualidade"]["avisos"],
        "ano_ref_monetario": res["qualidade"]["ano_ref_monetario"],
        "fontes": [f["rotulo"] for f in fontes],
        "url_observatorio": url,
    }
    return ResultadoFerramenta(dados, fontes, frozenset({url}), res["texto"]["manchete"])


def _recorte_de_quantidade(produto: str) -> servicos.Recorte:
    for indicador in QUANTIDADES_PARA_PRECO:
        try:
            return servicos.obter_recorte(produto, indicador)
        except (NaoEncontrado, RecorteIncompativel):
            continue
    raise ErroDeFerramenta(f"O produto '{produto}' não tem quantidade para calcular preço médio")


def _preco(e: dict[str, Any]) -> ResultadoFerramenta:
    recorte_valor = servicos.obter_recorte(e["produto"], "valor-da-producao")
    recorte_qtd = _recorte_de_quantidade(e["produto"])
    _, fim = servicos.resolver_periodo(recorte_valor, None, e.get("ano"))
    valor = servicos.ranking(recorte_valor, fim, fim)["total_estadual"]
    quantidade = servicos.ranking(recorte_qtd, fim, fim)["total_estadual"]
    if not valor or not quantidade:
        raise ErroDeFerramenta(f"Sem valor ou quantidade de {recorte_valor.produto.nome} em {fim}")
    # valor do IBGE vem em mil reais; o preço médio sai em reais por unidade da quantidade
    preco = valor * 1000 / quantidade
    unidade = SINGULAR.get(recorte_qtd.unidade, recorte_qtd.unidade.lower())
    url = _url_painel(
        segmento=recorte_valor.produto.segmento, produto=recorte_valor.produto.slug,
        indicador="valor-da-producao", fim=fim,
    )
    fonte = _fonte(recorte_valor.produto.tabela_origem, fim, url)
    dados = {
        "produto": recorte_valor.produto.nome,
        "ano_referencia": fim,
        "valor_total": valor,
        "valor_formatado": _fmt(valor),
        "unidade_valor": recorte_valor.unidade,
        "quantidade_total": quantidade,
        "quantidade_formatada": _fmt(quantidade),
        "unidade_quantidade": recorte_qtd.unidade,
        "preco_medio_formatado": _fmt(preco, 2),
        "unidade_preco": f"R$ por {unidade}",
        "observacao": "Preço médio implícito (valor ÷ quantidade), não é cotação de mercado.",
        "fonte": fonte["rotulo"],
        "url_painel": url,
    }
    resumo = (
        f"Em {fim}, a produção de {recorte_valor.produto.nome} em Rondônia valeu "
        f"{dados['valor_formatado']} ({recorte_valor.unidade.lower()}), um preço médio implícito de "
        f"R$ {dados['preco_medio_formatado']} por {unidade}. Fonte: {fonte['rotulo']}."
    )
    return ResultadoFerramenta(dados, [fonte], frozenset({url}), resumo)


_EXECUTORES: dict[str, Callable[[dict[str, Any]], ResultadoFerramenta]] = {
    "ranking_municipios": _ranking,
    "evolucao_e_analise": _analise,
    "bloco_observatorio": _observatorio,
    "valor_e_preco_medio": _preco,
}


def executar(nome: str, entrada: dict[str, Any]) -> ResultadoFerramenta:
    # o modelo às vezes erra só a caixa do nome; aceitar quando não há ambiguidade
    executor = _EXECUTORES.get(nome) or _EXECUTORES.get(nome.lower())
    if executor is None:
        raise ErroDeFerramenta(f"Ferramenta '{nome}' não existe. Use: {', '.join(_EXECUTORES)}.")
    try:
        return executor(entrada)
    except (NaoEncontrado, ConsultaInvalida, RecorteIncompativel) as exc:
        raise ErroDeFerramenta(str(exc)) from exc
