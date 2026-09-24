from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand

from ingestao import snapshot


class Command(BaseCommand):
    help = "Gera o snapshot versionável dos dados em data/seed/ (make snapshot)."

    def handle(self, *args: Any, **opts: Any) -> None:
        destino = settings.SEED_DIR / snapshot.ARQUIVO
        contagem = snapshot.gerar(destino)
        tamanho = destino.stat().st_size / 1024
        self.stdout.write(self.style.SUCCESS(f"{destino} ({tamanho:.0f} KiB): {contagem}"))
