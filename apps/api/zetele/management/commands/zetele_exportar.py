import csv
from datetime import timedelta
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from zetele.models import Pergunta

# Planilha executa célula que começa com estes caracteres como fórmula (injeção de CSV).
_INICIO_DE_FORMULA = ("=", "+", "-", "@", "\t", "\r")


def _celula(texto: str) -> str:
    return f"'{texto}" if texto.startswith(_INICIO_DE_FORMULA) else texto


class Command(BaseCommand):
    help = "Imprime em CSV as perguntas feitas ao Zétele nos últimos N dias (base do FAQ)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--dias", type=int, default=90)

    def handle(self, *args: Any, **opts: Any) -> None:
        desde = timezone.now() - timedelta(days=opts["dias"])
        escritor = csv.writer(self.stdout)
        escritor.writerow(["texto", "status", "pagina", "criada_em"])
        for p in Pergunta.objects.filter(criada_em__gte=desde).order_by("criada_em"):
            linha = [_celula(p.texto), _celula(p.status), _celula(p.pagina)]
            escritor.writerow([*linha, p.criada_em.isoformat()])
