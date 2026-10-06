"""Serviços de leitura do núcleo: catálogo, ranking, série e comparação."""

import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from django.db import connection
from django.db.models import Max, Min, Sum

from indicadores import dominio
from indicadores.catalogo import FONTES, INDICADORES, PESO_DA_MEDIA
from indicadores.dominio import ItemRanking
from indicadores.erros import ConsultaInvalida, NaoEncontrado, RecorteIncompativel
from indicadores.models import (
    Agregacao,
    Indicador,
    Medicao,
    Municipio,
    Produto,
    ProdutoIndicador,
    StatusValor,
)
from ingestao.models import Carga

MAX_COMPARACAO = 5
MIN_COMPARACAO = 2
JANELA_PADRAO = 10


@dataclass(frozen=True)
class Recorte:
    produto: Produto
    indicador: Indicador
    unidade: str


@dataclass(frozen=True)
class Ponto:
    ano: int
    valor: Decimal | None
    status: str


@dataclass(frozen=True)
class SerieNomeada:
    id: str
    nome: str
    pontos: list[Ponto]


def _sem_acento(texto: str) -> str:
    base = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in base if not unicodedata.combining(c)).lower()


def listar_produtos(segmento: str | None = None, busca: str | None = None) -> list[Produto]:
    qs = Produto.objects.all().order_by("nome")
    if segmento:
        qs = qs.filter(segmento=segmento)
    produtos = list(qs)
    if busca:
        termo = _sem_acento(busca)
        produtos = [p for p in produtos if termo in _sem_acento(p.nome)]
    return sorted(produtos, key=lambda p: _sem_acento(p.nome))


def obter_produto(slug: str) -> Produto:
    try:
        return Produto.objects.get(slug=slug)
    except Produto.DoesNotExist:
        raise NaoEncontrado(f"Produto '{slug}' não existe") from None


def listar_indicadores(produto: Produto) -> list[ProdutoIndicador]:
    ordem = {d.slug: n for n, d in enumerate(INDICADORES.values())}
    vinculos = list(ProdutoIndicador.objects.filter(produto=produto).select_related("indicador"))
    return sorted(vinculos, key=lambda v: ordem.get(v.indicador.slug, 99))


def obter_recorte(produto_slug: str, indicador_slug: str) -> Recorte:
    produto = obter_produto(produto_slug)
    try:
        vinculo = ProdutoIndicador.objects.select_related("indicador").get(
            produto=produto, indicador__slug=indicador_slug
        )
    except ProdutoIndicador.DoesNotExist:
        raise NaoEncontrado(
            f"Indicador '{indicador_slug}' não existe para o produto '{produto_slug}'"
        ) from None
    return Recorte(produto, vinculo.indicador, vinculo.unidade)


def obter_municipio(codigo: str) -> Municipio:
    try:
        return Municipio.objects.get(codigo_ibge=codigo)
    except Municipio.DoesNotExist:
        raise NaoEncontrado(f"Município '{codigo}' não existe") from None


def anos_com_dados(recorte: Recorte) -> tuple[int, int] | None:
    agg = Medicao.objects.filter(
        produto=recorte.produto, indicador=recorte.indicador, status_valor=StatusValor.OK
    ).aggregate(minimo=Min("ano"), maximo=Max("ano"))
    if agg["maximo"] is None:
        return None
    return int(agg["minimo"]), int(agg["maximo"])


def resolver_periodo(recorte: Recorte, inicio: int | None, fim: int | None) -> tuple[int, int]:
    """`fim` é o ano de referência do ranking; padrão: último ano com dados e 10 anos de janela."""
    if fim is None:
        anos = anos_com_dados(recorte)
        if anos is None:
            raise NaoEncontrado("Não há dados publicados para este produto e indicador")
        fim = anos[1]
    if inicio is None:
        inicio = fim - (JANELA_PADRAO - 1)
    if inicio > fim:
        raise ConsultaInvalida(
            "O ano inicial não pode ser maior que o ano final", {"inicio": "maior que fim"}
        )
    return inicio, fim


def meta_da_tabela(tabela: int) -> dict[str, Any]:
    fonte = FONTES[tabela]
    ultima = (
        Carga.objects.filter(
            tabela=tabela,
            status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA],
            concluida_em__isnull=False,
        )
        .order_by("-concluida_em")
        .first()
    )
    return {
        "fonte": fonte.nome,
        "tabela_sidra": fonte.tabela_sidra,
        "url_fonte": fonte.url,
        "atualizado_em": ultima.concluida_em if ultima else None,
    }


def formatar_data(momento: datetime | None) -> str | None:
    if momento is None:
        return None
    return momento.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _pares_ponderados(
    recorte: Recorte, inicio: int, fim: int
) -> dict[tuple[str, int], tuple[Decimal, Decimal]]:
    peso_slug = PESO_DA_MEDIA.get(recorte.indicador.slug)
    if peso_slug is None:
        return {}
    filtro = {
        "produto": recorte.produto,
        "ano__range": (inicio, fim),
        "status_valor": StatusValor.OK,
    }
    valores = {
        (m.municipio_id, m.ano): m.valor
        for m in Medicao.objects.filter(indicador=recorte.indicador, **filtro)
        if m.valor is not None
    }
    pares: dict[tuple[str, int], tuple[Decimal, Decimal]] = {}
    for m in Medicao.objects.filter(indicador__slug=peso_slug, **filtro):
        chave = (m.municipio_id, m.ano)
        if m.valor is not None and chave in valores:
            pares[chave] = (valores[chave], m.valor)
    return pares


def ranking(recorte: Recorte, inicio: int, fim: int) -> dict[str, Any]:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT municipio_id, valor, status_valor FROM mv_ranking "
            "WHERE produto_id = %s AND indicador_id = %s AND ano = %s",
            [recorte.produto.pk, recorte.indicador.pk, fim],
        )
        medicoes = {codigo: (valor, status) for codigo, valor, status in cursor.fetchall()}
    agregacao = recorte.indicador.agregacao
    valores_ok = [v for v, s in medicoes.values() if s == StatusValor.OK]
    pares = [p for (_, ano), p in _pares_ponderados(recorte, fim, fim).items() if ano == fim]
    total = dominio.total_por_regra(agregacao, valores_ok, pares)
    municipios = list(Municipio.objects.order_by("codigo_ibge").values_list("codigo_ibge", "nome"))
    itens: list[ItemRanking] = dominio.montar_ranking(municipios, medicoes, total, agregacao)
    return {
        "ano_referencia": fim,
        "total_estadual": total,
        "itens": itens,
    }


def _serie_municipio(recorte: Recorte, municipio: Municipio, inicio: int, fim: int) -> list[Ponto]:
    por_ano = {
        m.ano: m
        for m in Medicao.objects.filter(
            produto=recorte.produto,
            indicador=recorte.indicador,
            municipio=municipio,
            ano__range=(inicio, fim),
        )
    }
    pontos = []
    for ano in range(inicio, fim + 1):
        m = por_ano.get(ano)
        pontos.append(
            Ponto(ano, m.valor, m.status_valor) if m else Ponto(ano, None, StatusValor.INEXISTENTE)
        )
    return pontos


def _serie_total(recorte: Recorte, inicio: int, fim: int) -> list[Ponto]:
    agregacao = recorte.indicador.agregacao
    totais: dict[int, Decimal | None] = {}
    if agregacao == Agregacao.SOMA:
        linhas = (
            Medicao.objects.filter(
                produto=recorte.produto,
                indicador=recorte.indicador,
                status_valor=StatusValor.OK,
                ano__range=(inicio, fim),
            )
            .values("ano")
            .annotate(total=Sum("valor"))
        )
        totais = {int(linha["ano"]): linha["total"] for linha in linhas}
    elif agregacao == Agregacao.MEDIA_PONDERADA:
        por_ano: dict[int, list[tuple[Decimal, Decimal]]] = {}
        for (_, ano), par in _pares_ponderados(recorte, inicio, fim).items():
            por_ano.setdefault(ano, []).append(par)
        totais = {ano: dominio.media_ponderada(pares) for ano, pares in por_ano.items()}
    pontos = []
    for ano in range(inicio, fim + 1):
        valor = totais.get(ano)
        pontos.append(
            Ponto(ano, valor, StatusValor.OK if valor is not None else StatusValor.INEXISTENTE)
        )
    return pontos


def serie(
    recorte: Recorte, inicio: int, fim: int, municipio: Municipio | None = None
) -> list[Ponto]:
    if municipio is not None:
        return _serie_municipio(recorte, municipio, inicio, fim)
    return _serie_total(recorte, inicio, fim)


def comparacao_municipios(
    recorte: Recorte, inicio: int, fim: int, codigos: list[str]
) -> list[SerieNomeada]:
    _validar_quantidade(codigos, "municipios")
    resultado = []
    for codigo in codigos:
        municipio = obter_municipio(codigo)
        resultado.append(
            SerieNomeada(codigo, municipio.nome, _serie_municipio(recorte, municipio, inicio, fim))
        )
    return resultado


def comparacao_produtos(
    recortes: list[Recorte], inicio: int, fim: int, municipio: Municipio | None
) -> list[SerieNomeada]:
    _validar_quantidade(recortes, "produtos")
    unidades = {r.unidade for r in recortes}
    if len(unidades) > 1:
        raise RecorteIncompativel(
            "Não é possível comparar produtos com unidades diferentes: "
            + ", ".join(sorted(unidades))
        )
    return [
        SerieNomeada(r.produto.slug, r.produto.nome, serie(r, inicio, fim, municipio))
        for r in recortes
    ]


def _validar_quantidade(itens: list[Any], campo: str) -> None:
    if not MIN_COMPARACAO <= len(itens) <= MAX_COMPARACAO:
        raise ConsultaInvalida(
            f"Informe de {MIN_COMPARACAO} a {MAX_COMPARACAO} itens para comparar",
            {campo: f"esperado de {MIN_COMPARACAO} a {MAX_COMPARACAO} itens"},
        )
