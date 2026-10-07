from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from indicadores.api.parametros import validar_consulta
from indicadores.api.views import ERROS
from observatorio import servico
from observatorio.api import serializers as sz


class PanoramaView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaPanoramaSerializer],
        responses={200: sz.PanoramaSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaPanoramaSerializer, request)
        resultado = servico.panorama(d.get("ano"), int(d["janela"]))
        return Response(sz.PanoramaSerializer(resultado).data)


class CrescimentoView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaCrescimentoSerializer],
        responses={200: sz.CrescimentoSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaCrescimentoSerializer, request)
        resultado = servico.crescimento(d.get("cultura"), d.get("inicio"), d.get("fim"))
        return Response(sz.CrescimentoSerializer(resultado).data)


class TerritorioView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaTerritorioSerializer],
        responses={200: sz.TerritorioSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaTerritorioSerializer, request)
        resultado = servico.territorio(d["metrica"], d.get("cultura"), d.get("ano"))
        return Response(sz.TerritorioSerializer(resultado).data)


class PecuariaView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaPecuariaSerializer],
        responses={200: sz.PecuariaSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        d = validar_consulta(sz.ConsultaPecuariaSerializer, request)
        resultado = servico.pecuaria(d.get("rebanho"), d.get("inicio"), d.get("fim"))
        return Response(sz.PecuariaSerializer(resultado).data)
