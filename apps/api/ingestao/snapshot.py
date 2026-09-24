"""Snapshot versionável do banco de fatos (ADR 0017): gera e restaura sem acessar o IBGE."""

import gzip
import json
from pathlib import Path
from typing import Any

from django.core.management.color import no_style
from django.db import connection, transaction

from indicadores.aplicacao import atualizar_views
from indicadores.models import Indicador, Medicao, Municipio, Produto, ProdutoIndicador
from ingestao.models import Carga

VERSAO = 1
ARQUIVO = "faperon-seed.json.gz"


def _iso(momento: Any) -> str | None:
    return None if momento is None else momento.isoformat()


def gerar(destino: Path) -> dict[str, int]:
    """Serializa dimensões, cargas e fatos de forma determinística (mesmos dados = mesmos bytes)."""
    ids = set(Medicao.objects.values_list("carga_id", flat=True))
    for tabela in Carga.objects.values_list("tabela", flat=True).distinct():
        ultima = (
            Carga.objects.filter(
                tabela=tabela, status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA]
            )
            .order_by("-concluida_em")
            .first()
        )
        if ultima is not None:
            ids.add(ultima.pk)
    cargas = Carga.objects.filter(pk__in=ids).order_by("id")
    conteudo = {
        "versao": VERSAO,
        "cargas": [
            [c.id, c.tabela, _iso(c.iniciada_em), _iso(c.concluida_em), c.linhas, c.hash, c.status]
            for c in cargas
        ],
        "produtos": list(
            Produto.objects.order_by("id").values_list(
                "id", "slug", "codigo_ibge", "nome", "segmento", "tabela_origem"
            )
        ),
        "indicadores": list(
            Indicador.objects.order_by("id").values_list(
                "id", "slug", "codigo_ibge", "nome", "agregacao"
            )
        ),
        "produto_indicadores": list(
            ProdutoIndicador.objects.order_by("id").values_list(
                "id", "produto_id", "indicador_id", "unidade"
            )
        ),
        "municipios": list(
            Municipio.objects.order_by("codigo_ibge").values_list(
                "codigo_ibge", "nome", "microrregiao"
            )
        ),
        "medicoes": [
            [m[0], m[1], m[2], m[3], None if m[4] is None else str(m[4]), m[5], m[6]]
            for m in Medicao.objects.order_by("produto_id", "indicador_id", "municipio_id", "ano")
            .values_list(
                "produto_id",
                "indicador_id",
                "municipio_id",
                "ano",
                "valor",
                "status_valor",
                "carga_id",
            )
            .iterator(chunk_size=20000)
        ],
    }
    destino.parent.mkdir(parents=True, exist_ok=True)
    bruto = json.dumps(conteudo, ensure_ascii=False, separators=(",", ":")).encode()
    with (
        destino.open("wb") as bruto_arquivo,
        gzip.GzipFile(
            filename="", fileobj=bruto_arquivo, mode="wb", mtime=0, compresslevel=9
        ) as gz,
    ):
        gz.write(bruto)
    return {k: len(v) for k, v in conteudo.items() if isinstance(v, list)}


def _resetar_sequencias(*modelos: Any) -> None:
    with connection.cursor() as cursor:
        for sql in connection.ops.sequence_reset_sql(no_style(), list(modelos)):
            cursor.execute(sql)


def _apagar_dados() -> None:
    Medicao.objects.all().delete()
    ProdutoIndicador.objects.all().delete()
    Produto.objects.all().delete()
    Indicador.objects.all().delete()
    Municipio.objects.all().delete()
    Carga.objects.all().delete()


def restaurar(origem: Path, *, forcar: bool = False) -> dict[str, int]:
    """Carrega o snapshot. Sem `forcar`, exige o banco de fatos vazio."""
    from datetime import datetime

    with gzip.open(origem, "rb") as arquivo:
        dados = json.loads(arquivo.read())
    if dados["versao"] != VERSAO:
        raise ValueError(f"Versão de snapshot não suportada: {dados['versao']}")

    def data(texto: str | None) -> datetime | None:
        return None if texto is None else datetime.fromisoformat(texto)

    with transaction.atomic():
        if forcar:
            _apagar_dados()
        elif Medicao.objects.exists():
            raise ValueError("O banco já tem medições; use forcar para substituir")
        Carga.objects.bulk_create(
            [
                Carga(
                    id=c[0],
                    tabela=c[1],
                    iniciada_em=datetime.fromisoformat(c[2]),
                    concluida_em=data(c[3]),
                    linhas=c[4],
                    hash=c[5],
                    status=c[6],
                )
                for c in dados["cargas"]
            ]
        )
        Municipio.objects.bulk_create(
            [Municipio(codigo_ibge=m[0], nome=m[1], microrregiao=m[2]) for m in dados["municipios"]]
        )
        Produto.objects.bulk_create(
            [
                Produto(
                    id=p[0],
                    slug=p[1],
                    codigo_ibge=p[2],
                    nome=p[3],
                    segmento=p[4],
                    tabela_origem=p[5],
                )
                for p in dados["produtos"]
            ]
        )
        Indicador.objects.bulk_create(
            [
                Indicador(id=i[0], slug=i[1], codigo_ibge=i[2], nome=i[3], agregacao=i[4])
                for i in dados["indicadores"]
            ]
        )
        ProdutoIndicador.objects.bulk_create(
            [
                ProdutoIndicador(id=v[0], produto_id=v[1], indicador_id=v[2], unidade=v[3])
                for v in dados["produto_indicadores"]
            ],
        )
        lote: list[Medicao] = []
        for m in dados["medicoes"]:
            lote.append(
                Medicao(
                    produto_id=m[0],
                    indicador_id=m[1],
                    municipio_id=m[2],
                    ano=m[3],
                    valor=m[4],
                    status_valor=m[5],
                    carga_id=m[6],
                )
            )
            if len(lote) >= 10000:
                Medicao.objects.bulk_create(lote)
                lote = []
        if lote:
            Medicao.objects.bulk_create(lote)
        _resetar_sequencias(Carga, Produto, Indicador, ProdutoIndicador, Medicao)
    atualizar_views()
    return {k: len(v) for k, v in dados.items() if isinstance(v, list)}
