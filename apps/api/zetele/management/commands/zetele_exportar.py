import csv
from datetime import timedelta
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from zetele.models import Pergunta


class Command(BaseCommand):
    help = "Imprime em CSV as perguntas feitas ao Zétele nos últimos N dias (base do FAQ)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--dias", type=int, default=90)

    def handle(self, *args: Any, **opts: Any) -> None:
        desde = timezone.now() - timedelta(days=opts["dias"])
        escritor = csv.writer(self.stdout)
        escritor.writerow(["texto", "status", "pagina", "criada_em"])
        for p in Pergunta.objects.filter(criada_em__gte=desde).order_by("criada_em"):
            escritor.writerow([p.texto, p.status, p.pagina, p.criada_em.isoformat()])
