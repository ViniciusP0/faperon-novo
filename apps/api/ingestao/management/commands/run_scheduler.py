import logging
import time
from typing import Any

from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.utils import timezone

from ingestao.agendador import precisa_ingerir
from ingestao.models import Carga
from ingestao.servico import CargaFalhou, executar_carga
from ingestao.sidra import SidraCliente
from ingestao.tabelas import TABELAS

log = logging.getLogger(__name__)
VERIFICACAO_A_CADA = 3600  # segundos


def rodar_ciclo(cliente: SidraCliente) -> int:
    """Uma passada por todas as tabelas. Retorna quantas cargas foram tentadas."""
    tentadas = 0
    for tabela in sorted(TABELAS):
        agora = timezone.now()
        concluida = (
            Carga.objects.filter(
                tabela=tabela, status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA]
            )
            .order_by("-concluida_em")
            .values_list("concluida_em", flat=True)
            .first()
        )
        tentativa = (
            Carga.objects.filter(tabela=tabela)
            .order_by("-iniciada_em")
            .values_list("iniciada_em", flat=True)
            .first()
        )
        if not precisa_ingerir(agora, concluida, tentativa):
            continue
        tentadas += 1
        try:
            carga = executar_carga(tabela, cliente)
            log.info("scheduler: tabela %s -> %s", tabela, carga.status)
        except CargaFalhou as exc:
            log.error("scheduler: tabela %s falhou: %s", tabela, exc)
    return tentadas


class Command(BaseCommand):
    help = "Roda a ingestão ao subir (se a última carga tem mais de 3 dias) e depois a cada 3 dias."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--uma-vez", action="store_true", help="faz só uma passada e sai")

    def handle(self, *args: Any, **opts: Any) -> None:
        cliente = SidraCliente()
        while True:
            close_old_connections()
            rodar_ciclo(cliente)
            if opts["uma_vez"]:
                return
            time.sleep(VERIFICACAO_A_CADA)
