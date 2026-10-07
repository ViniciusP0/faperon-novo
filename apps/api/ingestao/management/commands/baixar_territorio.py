import json
from pathlib import Path
from typing import Any

import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from indicadores.models import Municipio
from ingestao.territorio import (
    URL_LOCALIDADES,
    URL_MALHA,
    ErroTerritorio,
    microrregioes,
    normalizar_malha,
)

TIMEOUT = 60


class Command(BaseCommand):
    help = "Baixa a malha municipal de RO (GeoJSON do front) e preenche a microrregião dos municípios."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--destino", required=True, help="caminho do GeoJSON de saída")

    def handle(self, *args: Any, **opts: Any) -> None:
        codigos = set(Municipio.objects.values_list("codigo_ibge", flat=True))
        if len(codigos) != 52:
            raise CommandError(f"Cadastro tem {len(codigos)} municípios; rode a ingestão antes")
        try:
            malha = normalizar_malha(requests.get(URL_MALHA, timeout=TIMEOUT).json(), codigos)
            micro = microrregioes(requests.get(URL_LOCALIDADES, timeout=TIMEOUT).json())
        except (requests.RequestException, ValueError, ErroTerritorio) as exc:
            raise CommandError(str(exc)) from exc
        if set(micro) != codigos:
            raise CommandError("Localidades do IBGE diferentes do cadastro de municípios")
        destino = Path(opts["destino"])
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(json.dumps(malha, separators=(",", ":")), encoding="utf-8")
        with transaction.atomic():
            for codigo, nome in micro.items():
                Municipio.objects.filter(codigo_ibge=codigo).update(microrregiao=nome)
        self.stdout.write(self.style.SUCCESS(f"{destino}: {len(malha['features'])} municípios"))
