from django.apps import AppConfig


class AnaliseConfig(AppConfig):
    name = "analise"

    def ready(self) -> None:
        from analise.pdf import limpar_ao_concluir_carga
        from ingestao.signals import carga_concluida

        carga_concluida.connect(limpar_ao_concluir_carga, dispatch_uid="analise.limpar_relatorios")
