from django.apps import AppConfig


class IndicadoresConfig(AppConfig):
    name = "indicadores"

    def ready(self) -> None:
        from indicadores.aplicacao import atualizar_views
        from ingestao.signals import carga_concluida

        carga_concluida.connect(atualizar_views, dispatch_uid="indicadores.atualizar_views")
