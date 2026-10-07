"""Pipeline de ingestão: buscar → validar/normalizar → staging → upsert → sinalizar.

Cada etapa é idempotente. Falha mantém os dados anteriores (o upsert roda em uma transação)
e fica registrada na tabela `carga`.
"""

import hashlib
import json
import logging
from typing import Any, Protocol

from django.db import transaction
from django.utils import timezone

from indicadores.aplicacao import promover_staging
from indicadores.catalogo import (
    ANO_MINIMO_VALOR_PRODUCAO,
    INDICADORES,
    UNIDADE_VALOR_PRODUCAO,
    UNIDADES_PADRAO,
)
from indicadores.models import StatusValor
from ingestao.models import Carga, StagingMedicao
from ingestao.parser import Registro, limpar_nome_produto, parsear_dados
from ingestao.signals import carga_concluida
from ingestao.tabelas import CATEGORIA_TOTAL, TABELAS, TabelaSidra

log = logging.getLogger(__name__)
LOTE = 5000


class ClienteSidra(Protocol):
    def categorias(self, tabela: int, classificacao: int) -> list[tuple[str, str]]: ...

    def dados(
        self, tabela: int, variaveis: tuple[str, ...], classificacao: int | None, categoria: str
    ) -> list[dict[str, Any]]: ...


class CargaFalhou(Exception):
    pass


def _normalizar(cfg: TabelaSidra, registros: list[Registro]) -> list[StagingMedicao]:
    """Descarta ausentes e fora do escopo; ausente = linha inexistente no fato."""
    saida: list[StagingMedicao] = []
    for r in registros:
        if r.variavel_codigo not in INDICADORES or r.status == StatusValor.INEXISTENTE:
            continue
        unidade = r.unidade.strip() or UNIDADES_PADRAO.get(r.variavel_codigo, "")
        if r.variavel_codigo == "215":
            if r.ano < ANO_MINIMO_VALOR_PRODUCAO:
                continue
            unidade = UNIDADE_VALOR_PRODUCAO
        saida.append(
            StagingMedicao(
                tabela=cfg.codigo,
                produto_codigo=r.categoria_codigo,
                produto_nome=limpar_nome_produto(r.categoria_nome),
                indicador_codigo=r.variavel_codigo,
                unidade=unidade,
                municipio_codigo=r.municipio_codigo,
                municipio_nome=r.municipio_nome,
                ano=r.ano,
                valor=r.valor,
                status_valor=r.status,
            )
        )
    return saida


def executar_carga(
    tabela: int, cliente: ClienteSidra, *, forcar: bool = False, apenas: set[str] | None = None
) -> Carga:
    """Roda uma Carga da tabela. `apenas` restringe categorias (testes e reprocesso parcial)."""
    cfg = TABELAS[tabela]
    carga = Carga.objects.create(tabela=tabela, iniciada_em=timezone.now())
    try:
        hasher = hashlib.sha256()
        linhas: list[StagingMedicao] = []
        municipios: dict[str, str] = {}
        if cfg.classificacao is None:
            assert cfg.categoria_unica is not None
            categorias = [cfg.categoria_unica]
        else:
            categorias = [
                (codigo, nome)
                for codigo, nome in cliente.categorias(tabela, cfg.classificacao)
                if codigo != CATEGORIA_TOTAL and (apenas is None or codigo in apenas)
            ]
        for codigo, nome in categorias:
            resposta = cliente.dados(tabela, cfg.variaveis, cfg.classificacao, codigo)
            hasher.update(json.dumps(resposta, sort_keys=True, separators=(",", ":")).encode())
            registros = list(parsear_dados(resposta, cfg.categoria_unica))
            municipios.update({r.municipio_codigo: r.municipio_nome for r in registros})
            linhas.extend(_normalizar(cfg, registros))
            log.info("tabela %s: %s (%s) baixada", tabela, nome, codigo)
        if not linhas:
            raise CargaFalhou(f"Tabela {tabela} não retornou nenhuma medição")

        digest = hasher.hexdigest()
        anterior = (
            Carga.objects.filter(
                tabela=tabela, status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA]
            )
            .exclude(hash="")
            .first()
        )
        if not forcar and apenas is None and anterior is not None and anterior.hash == digest:
            carga.status = Carga.Status.INALTERADA
            carga.hash = digest
            carga.linhas = len(linhas)
            carga.concluida_em = timezone.now()
            carga.save()
            log.info("tabela %s: dados inalterados", tabela)
            return carga

        with transaction.atomic():
            for linha in linhas:
                linha.carga = carga
            StagingMedicao.objects.bulk_create(linhas, batch_size=LOTE)
            promover_staging(carga, cfg.segmento, municipios)
            StagingMedicao.objects.filter(carga=carga).delete()
            # Na mesma transação: se o REFRESH de mv_ranking falhar, os dados novos não ficam
            # publicados com o ranking antigo.
            carga_concluida.send(sender=Carga, carga=carga)
            # A baixa de SUCESSO também fica na transação: se ela falhar, a promoção é revertida.
            carga.status = Carga.Status.SUCESSO
            carga.hash = digest if apenas is None else ""
            carga.linhas = len(linhas)
            carga.concluida_em = timezone.now()
            carga.save()
        return carga
    except Exception as exc:
        carga.status = Carga.Status.FALHA
        carga.erro = str(exc)[:2000]
        carga.concluida_em = timezone.now()
        carga.save()
        log.error("tabela %s: carga %s falhou: %s", tabela, carga.pk, exc)
        if isinstance(exc, CargaFalhou):
            raise
        raise CargaFalhou(str(exc)) from exc
