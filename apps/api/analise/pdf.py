"""Relatório PDF (WeasyPrint) com cache por recorte + versão dos dados."""

import hashlib
import json
import threading
from datetime import datetime
from typing import Any

from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.safestring import mark_safe
from django.utils.text import slugify
from weasyprint import HTML

from analise import graficos
from analise.models import Relatorio
from analise.regras import formatar_numero
from analise.servico import ResultadoAnalise, analisar
from analise.tendencia import descrever_tendencia, tendencia_linear
from indicadores import servicos
from indicadores.erros import ConsultaInvalida
from indicadores.models import StatusValor
from ingestao.models import Carga

VERSAO_TEMPLATE = "3"
MAX_RELATORIOS = 200  # teto de PDFs guardados por versão dos dados (~centenas de KB cada)

# Gunicorn gthread: várias threads por processo. Pango/fontconfig não são confiáveis em
# renderizações simultâneas, e serializar deixa as outras threads livres para API e /saude.
_RENDERIZACAO = threading.Lock()


def renderizar(html: str) -> bytes:
    with _RENDERIZACAO:
        pdf = HTML(string=html).write_pdf()
    assert pdf is not None
    return pdf


def versao_dos_dados() -> str:
    ultima = Carga.objects.filter(status=Carga.Status.SUCESSO).order_by("-id").first()
    return str(ultima.pk) if ultima else "0"


def chave_do_recorte(parametros: dict[str, Any]) -> str:
    base = json.dumps(
        {"p": parametros, "dados": versao_dos_dados(), "t": VERSAO_TEMPLATE},
        sort_keys=True,
        ensure_ascii=True,
    )
    return hashlib.sha256(base.encode()).hexdigest()


def normalizar_comparacao(codigos: list[str]) -> list[str]:
    """Valida antes de gerar: códigos inexistentes ou fora de 2..5 nunca viram chave de cache."""
    if not codigos:
        return []
    unicos = sorted(set(codigos))
    if not servicos.MIN_COMPARACAO <= len(unicos) <= servicos.MAX_COMPARACAO:
        raise ConsultaInvalida(
            f"Informe de {servicos.MIN_COMPARACAO} a {servicos.MAX_COMPARACAO} municípios para comparar",
            {
                "municipios": f"esperado de {servicos.MIN_COMPARACAO} a {servicos.MAX_COMPARACAO} itens"
            },
        )
    for codigo in unicos:
        servicos.obter_municipio(codigo)
    return unicos


def limpar_relatorios(versao_atual: str) -> int:
    """Apaga PDFs de outras versões dos dados e mantém só os MAX_RELATORIOS mais recentes."""
    apagados, _ = Relatorio.objects.exclude(versao_dados=versao_atual).delete()
    manter = Relatorio.objects.order_by("-criado_em", "-id").values_list("id", flat=True)[
        :MAX_RELATORIOS
    ]
    excedentes, _ = Relatorio.objects.exclude(id__in=list(manter)).delete()
    return apagados + excedentes


def limpar_ao_concluir_carga(*args: object, carga: Carga, **kwargs: object) -> None:
    limpar_relatorios(str(carga.pk))


def _numero(valor: Any) -> str:
    return "X" if valor is None else formatar_numero(valor)


def _contexto(r: ResultadoAnalise, codigos_comparacao: list[str]) -> dict[str, Any]:
    tabela = r.recorte.produto.tabela_origem
    meta = servicos.meta_da_tabela(tabela)
    anos = [p.ano for p in r.pontos]
    valores = [None if p.valor is None else float(p.valor) for p in r.pontos]
    tendencia = tendencia_linear(anos, valores)
    grafico_serie = graficos.grafico_colunas(
        anos,
        [(r.recorte.indicador.nome, valores)],
        tendencia=tendencia.valores if tendencia else None,
    )
    grafico_comparacao = None
    if len(codigos_comparacao) >= 2:
        comparadas = servicos.comparacao_municipios(r.recorte, r.inicio, r.fim, codigos_comparacao)
        grafico_comparacao = graficos.grafico_colunas(
            anos,
            [
                (s.nome, [None if p.valor is None else float(p.valor) for p in s.pontos])
                for s in comparadas
            ],
        )
    linhas = []
    for item in r.ranking:
        if item.status == StatusValor.INEXISTENTE:
            continue
        linhas.append(
            {
                "posicao": item.posicao if item.posicao is not None else "—",
                "nome": item.nome,
                "valor": _numero(item.valor),
                "percentual": (
                    formatar_numero(item.percentual_total, 1) + "%"
                    if item.percentual_total is not None
                    else "—"
                ),
            }
        )
    atualizado: datetime | None = meta["atualizado_em"]
    return {
        "titulo": r.titulo,
        "produto": r.recorte.produto.nome,
        "indicador": r.recorte.indicador.nome,
        "unidade": r.recorte.unidade,
        "escopo": r.municipio.nome if r.municipio else "Rondônia",
        "inicio": r.inicio,
        "fim": r.fim,
        "grafico_serie": mark_safe(grafico_serie),  # noqa: S308
        "texto_tendencia": (
            descrever_tendencia(tendencia, r.recorte.unidade) if tendencia else None
        ),
        "grafico_comparacao": mark_safe(grafico_comparacao) if grafico_comparacao else None,  # noqa: S308
        "paragrafos": r.paragrafos,
        "ranking": linhas,
        "total_estadual": None if r.total_estadual is None else formatar_numero(r.total_estadual),
        "fonte": meta["fonte"],
        "tabela_sidra": meta["tabela_sidra"],
        "url_fonte": meta["url_fonte"],
        "atualizado_em": (
            timezone.localtime(atualizado).strftime("%d/%m/%Y %H:%M") if atualizado else "—"
        ),
        "gerado_em": timezone.localtime().strftime("%d/%m/%Y %H:%M"),
    }


def nome_do_arquivo(r: ResultadoAnalise) -> str:
    return f"faperon-{r.recorte.produto.slug}-{slugify(r.recorte.indicador.slug)}-{r.inicio}-{r.fim}.pdf"


def gerar_relatorio(
    produto: str,
    indicador: str,
    inicio: int | None,
    fim: int | None,
    municipio: str | None,
    comparacao: list[str],
) -> tuple[bytes, str]:
    """Retorna (pdf, nome). Mesmo recorte na mesma versão dos dados devolve o mesmo PDF."""
    comparacao = normalizar_comparacao(comparacao)
    r = analisar(produto, indicador, inicio, fim, municipio)
    versao = versao_dos_dados()
    chave = chave_do_recorte(
        {
            "produto": produto,
            "indicador": indicador,
            "inicio": r.inicio,
            "fim": r.fim,
            "municipio": municipio,
            "comparacao": comparacao,
        }
    )
    existente = Relatorio.objects.filter(chave=chave).first()
    if existente is not None:
        return bytes(existente.pdf), existente.nome_arquivo
    html = render_to_string("analise/relatorio.html", _contexto(r, comparacao))
    pdf = renderizar(html)
    nome = nome_do_arquivo(r)
    Relatorio.objects.update_or_create(
        chave=chave, defaults={"nome_arquivo": nome, "pdf": pdf, "versao_dados": versao}
    )
    limpar_relatorios(versao)
    return pdf, nome
