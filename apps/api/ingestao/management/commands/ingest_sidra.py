from typing import Any

from django.core.management.base import BaseCommand, CommandError

from ingestao.servico import CargaFalhou, executar_carga
from ingestao.sidra import SidraCliente
from ingestao.tabelas import TABELAS


class Command(BaseCommand):
    help = "Ingere PAM (5457), PPM (3939, 74, 94) e IPCA (1737) do IBGE SIDRA para o banco."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--tabela", type=int, action="append", choices=sorted(TABELAS))
        parser.add_argument(
            "--forcar", action="store_true", help="regrava mesmo se o hash não mudou"
        )
        parser.add_argument(
            "--produto", action="append", help="código de categoria (reprocesso parcial)"
        )

    def handle(self, *args: Any, **opts: Any) -> None:
        tabelas = opts["tabela"] or sorted(TABELAS)
        cliente = SidraCliente()
        falhas = 0
        for tabela in tabelas:
            try:
                carga = executar_carga(
                    tabela,
                    cliente,
                    forcar=opts["forcar"],
                    apenas=set(opts["produto"]) if opts["produto"] else None,
                )
                self.stdout.write(
                    self.style.SUCCESS(f"tabela {tabela}: {carga.status}, {carga.linhas} linhas")
                )
            except CargaFalhou as exc:
                falhas += 1
                self.stderr.write(self.style.ERROR(f"tabela {tabela}: falhou: {exc}"))
        if falhas:
            raise CommandError(f"{falhas} tabela(s) falharam")
