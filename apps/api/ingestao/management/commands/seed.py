from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from indicadores.models import Medicao
from ingestao import snapshot


class Command(BaseCommand):
    help = "Carrega o snapshot de data/seed/ no banco, sem acessar o IBGE (make seed)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--if-empty", action="store_true", help="só carrega se não há medições")
        parser.add_argument("--force", action="store_true", help="substitui os dados existentes")

    def handle(self, *args: Any, **opts: Any) -> None:
        if opts["if_empty"] and Medicao.objects.exists():
            self.stdout.write("Banco já tem medições; seed ignorado")
            return
        origem = settings.SEED_DIR / snapshot.ARQUIVO
        if not origem.exists():
            if opts["if_empty"]:
                self.stdout.write(f"Sem snapshot em {origem}; rode manage.py ingest_sidra")
                return
            raise CommandError(f"Snapshot não encontrado: {origem}")
        try:
            contagem = snapshot.restaurar(origem, forcar=opts["force"])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS(f"Snapshot carregado: {contagem}"))
