"""Leitura do modelo de Indicadores para o Observatório. Só consultas; nenhum cálculo de negócio."""

from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from django.db.models import Max, QuerySet, Sum

from indicadores.models import IndicePreco, Medicao, Municipio, Produto, StatusValor
from ingestao.models import Carga


def _ok(indicador: str, tabela: int) -> QuerySet[Medicao]:
    return Medicao.objects.filter(
        indicador__slug=indicador, produto__tabela_origem=tabela, status_valor=StatusValor.OK
    )


def indices_ipca() -> dict[int, Decimal]:
    return dict(IndicePreco.objects.values_list("ano", "indice_medio"))


def ultimo_ano(indicador: str, tabela: int) -> int | None:
    ano = _ok(indicador, tabela).aggregate(m=Max("ano"))["m"]
    return None if ano is None else int(ano)


def anos_disponiveis(indicador: str, tabela: int) -> list[int]:
    return sorted(int(a) for a in _ok(indicador, tabela).values_list("ano", flat=True).distinct())


def totais_por_produto(
    indicador: str, tabela: int, inicio: int, fim: int
) -> dict[str, dict[int, Decimal]]:
    saida: dict[str, dict[int, Decimal]] = {}
    linhas = (
        _ok(indicador, tabela)
        .filter(ano__range=(inicio, fim))
        .values("produto__slug", "ano")
        .annotate(total=Sum("valor"))
    )
    for linha in linhas:
        saida.setdefault(linha["produto__slug"], {})[int(linha["ano"])] = linha["total"]
    return saida


def por_municipio(
    indicador: str, tabela: int, ano: int, produto: str | None = None
) -> dict[str, Decimal]:
    qs = _ok(indicador, tabela).filter(ano=ano)
    if produto:
        qs = qs.filter(produto__slug=produto)
    linhas = qs.values("municipio_id").annotate(t=Sum("valor")).values_list("municipio_id", "t")
    return dict(linhas)


def por_municipio_e_produto(indicador: str, tabela: int, ano: int) -> dict[str, dict[str, Decimal]]:
    saida: dict[str, dict[str, Decimal]] = {}
    linhas = (
        _ok(indicador, tabela)
        .filter(ano=ano)
        .values_list("municipio_id", "produto__slug", "valor")
    )
    for mun, slug, valor in linhas:
        if valor is not None:
            saida.setdefault(mun, {})[slug] = valor
    return saida


def codigos_sigilosos(
    indicador: str, tabela: int, ano: int, produto: str | None = None
) -> list[str]:
    qs = Medicao.objects.filter(
        indicador__slug=indicador,
        produto__tabela_origem=tabela,
        ano=ano,
        status_valor=StatusValor.SIGILOSO,
    )
    if produto:
        qs = qs.filter(produto__slug=produto)
    return sorted(set(qs.values_list("municipio_id", flat=True)))


def sigilosos(indicador: str, tabela: int, ano: int, produto: str | None = None) -> int:
    return len(codigos_sigilosos(indicador, tabela, ano, produto))


def produtos(tabela: int) -> dict[str, str]:
    return dict(
        Produto.objects.filter(tabela_origem=tabela).order_by("nome").values_list("slug", "nome")
    )


def municipios() -> list[tuple[str, str, str]]:
    return list(Municipio.objects.order_by("nome").values_list("codigo_ibge", "nome", "microrregiao"))


def atualizado_em(tabelas: Sequence[int]) -> datetime | None:
    return Carga.objects.filter(
        tabela__in=tabelas, status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA]
    ).aggregate(m=Max("concluida_em"))["m"]


def por_municipio_na_janela(
    indicador: str, tabela: int, produto: str, inicio: int, fim: int
) -> dict[int, dict[str, Decimal]]:
    """{ano: {município: valor}} de um produto em UMA consulta; só valores OK e presentes."""
    saida: dict[int, dict[str, Decimal]] = {}
    linhas = (
        _ok(indicador, tabela)
        .filter(produto__slug=produto, ano__range=(inicio, fim), valor__isnull=False)
        .values_list("ano", "municipio_id", "valor")
    )
    for ano, mun, valor in linhas:
        if valor is not None:
            saida.setdefault(int(ano), {})[mun] = valor
    return saida


def municipios_com_sigilo(indicador: str, tabela: int, ano: int) -> set[str]:
    """Municípios com ao menos uma linha sigilosa no ano (qualquer produto), em UMA consulta."""
    return set(
        Medicao.objects.filter(
            indicador__slug=indicador,
            produto__tabela_origem=tabela,
            ano=ano,
            status_valor=StatusValor.SIGILOSO,
        ).values_list("municipio_id", flat=True)
    )
