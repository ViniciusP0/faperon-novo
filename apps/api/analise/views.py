from typing import Any

from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from analise import pdf, servico
from analise.throttles import PdfGlobalThrottle
from indicadores.api import apresentacao as ap
from indicadores.api import serializers as sz
from indicadores.api.parametros import lista_csv, validar_consulta
from indicadores.api.views import ERROS


class TopMunicipioSerializer(serializers.Serializer):
    municipio = sz.MunicipioSerializer()
    valor = serializers.FloatField()
    percentual = serializers.FloatField(allow_null=True)


class AnoValorSerializer(serializers.Serializer):
    ano = serializers.IntegerField()
    valor = serializers.FloatField()


class MetricasSerializer(serializers.Serializer):
    variacao_absoluta = serializers.FloatField(allow_null=True)
    variacao_percentual = serializers.FloatField(allow_null=True)
    cagr_percentual = serializers.FloatField(allow_null=True)
    maior_ano = AnoValorSerializer(allow_null=True)
    menor_ano = AnoValorSerializer(allow_null=True)
    top5 = TopMunicipioSerializer(many=True)
    concentracao_top5_percentual = serializers.FloatField(allow_null=True)


class AnaliseSerializer(serializers.Serializer):
    titulo = serializers.CharField()
    paragrafos = serializers.ListField(child=serializers.CharField())
    metricas = MetricasSerializer()
    meta = sz.MetaSerializer()


class ConsultaRelatorioSerializer(sz.ConsultaSerieSerializer):
    municipios = serializers.CharField(
        required=False, help_text="2 a 5 códigos IBGE separados por vírgula (gráfico de comparação)"
    )


class AnaliseView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaSerieSerializer],
        responses={200: AnaliseSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        dados = validar_consulta(sz.ConsultaSerieSerializer, request)
        r = servico.analisar(
            dados["produto"],
            dados["indicador"],
            dados.get("inicio"),
            dados.get("fim"),
            dados.get("municipio"),
        )
        corpo = {
            "titulo": r.titulo,
            "paragrafos": r.paragrafos,
            "metricas": servico.metricas_para_api(r.metricas),
            "meta": ap.meta(r.recorte.produto.tabela_origem),
        }
        return Response(AnaliseSerializer(corpo).data)


class RelatorioPdfView(APIView):
    throttle_classes = [ScopedRateThrottle, PdfGlobalThrottle]
    throttle_scope = "pdf"

    @extend_schema(
        parameters=[ConsultaRelatorioSerializer],
        responses={
            (200, "application/pdf"): OpenApiTypes.BINARY,
            429: OpenApiResponse(sz.ErroSerializer, description="Limite de requisições"),
            **ERROS,
        },
    )
    def get(self, request: Request) -> HttpResponse:
        dados: dict[str, Any] = validar_consulta(ConsultaRelatorioSerializer, request)
        conteudo, nome = pdf.gerar_relatorio(
            dados["produto"],
            dados["indicador"],
            dados.get("inicio"),
            dados.get("fim"),
            dados.get("municipio"),
            lista_csv(dados.get("municipios")),
        )
        resposta = HttpResponse(conteudo, content_type="application/pdf")
        resposta["Content-Disposition"] = f'attachment; filename="{nome}"'
        return resposta
