from datetime import date
from typing import Any, Literal, cast

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.utils import timezone

from boletim.coleta import coletar_dia
from zetele.cliente import ClienteAnthropic


class Command(BaseCommand):
    help = "Coleta o boletim do DOU e do DOE de um dia (padrão: hoje no fuso local)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--dia", help="data no formato AAAA-MM-DD (padrão: hoje)")
        parser.add_argument("--fonte", choices=["dou", "doe"], help="só uma fonte")

    def handle(self, *args: Any, **opts: Any) -> None:
        if not settings.BOLETIM_ATIVO:
            raise CommandError("O Boletim do Agro está desligado (BOLETIM_ATIVO).")
        if not settings.ANTHROPIC_API_KEY:
            raise CommandError("Sem ANTHROPIC_API_KEY: a classificação do boletim precisa dela.")
        try:
            dia = date.fromisoformat(opts["dia"]) if opts["dia"] else timezone.localdate()
        except ValueError as erro:
            raise CommandError(f"Data inválida: {opts['dia']!r}. Use AAAA-MM-DD.") from erro
        llm = ClienteAnthropic(settings.ANTHROPIC_API_KEY, settings.BOLETIM_MODELO)
        for fonte in [opts["fonte"]] if opts["fonte"] else ["dou", "doe"]:
            coleta = coletar_dia(dia, cast(Literal["dou", "doe"], fonte), llm)
            self.stdout.write(f"{coleta.fonte} {coleta.dia} {coleta.status} lidos={coleta.lidos}")
