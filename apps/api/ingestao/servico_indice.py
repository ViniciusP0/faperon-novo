"""Carga do IPCA (SIDRA 1737): série nacional mensal → média anual em IndicePreco."""

import hashlib
import json
import logging
from typing import Any, Protocol

from django.db import transaction
from django.utils import timezone

from indicadores.aplicacao import gravar_indices_preco
from ingestao.models import Carga
from ingestao.parser import medias_anuais, parsear_indice_mensal
from ingestao.servico import CargaFalhou
from ingestao.tabelas import TABELA_IPCA, VARIAVEL_IPCA

log = logging.getLogger(__name__)


class ClienteSerieNacional(Protocol):
    def serie_nacional(self, tabela: int, variavel: str) -> list[dict[str, Any]]: ...


def executar_carga_ipca(cliente: ClienteSerieNacional, *, forcar: bool = False) -> Carga:
    carga = Carga.objects.create(tabela=TABELA_IPCA, iniciada_em=timezone.now())
    try:
        resposta = cliente.serie_nacional(TABELA_IPCA, VARIAVEL_IPCA)
        digest = hashlib.sha256(
            json.dumps(resposta, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        medias = medias_anuais(parsear_indice_mensal(resposta))
        if not medias:
            raise CargaFalhou("IPCA não retornou nenhum ano completo")
        anterior = (
            Carga.objects.filter(
                tabela=TABELA_IPCA, status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA]
            )
            .exclude(pk=carga.pk)
            .exclude(hash="")
            .first()
        )
        carga.hash = digest
        carga.linhas = len(medias)
        with transaction.atomic():
            if not forcar and anterior is not None and anterior.hash == digest:
                carga.status = Carga.Status.INALTERADA
            else:
                gravar_indices_preco(carga, medias)
                carga.status = Carga.Status.SUCESSO
            # A baixa de SUCESSO fica na transação: se o save falhar, a gravação é revertida.
            carga.concluida_em = timezone.now()
            carga.save()
        return carga
    except Exception as exc:
        carga.status = Carga.Status.FALHA
        carga.erro = str(exc)[:2000]
        carga.concluida_em = timezone.now()
        carga.save()
        log.error("IPCA: carga %s falhou: %s", carga.pk, exc)
        if isinstance(exc, CargaFalhou):
            raise
        raise CargaFalhou(str(exc)) from exc
