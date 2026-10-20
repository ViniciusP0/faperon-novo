from datetime import date

from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from boletim import leitura
from boletim.api import serializers as sz
from indicadores.api.parametros import validar_consulta
from indicadores.api.views import ERROS
from indicadores.erros import ConsultaInvalida


class DiasView(APIView):
    @extend_schema(
        summary="Dias disponíveis do boletim",
        responses={200: sz.ListaDiasSerializer},
    )
    def get(self, request: Request) -> Response:
        return Response({"dias": leitura.listar_dias(leitura.hoje())})


class DiaView(APIView):
    @extend_schema(
        summary="Destaque e notas de um dia",
        parameters=[sz.ConsultaDiaSerializer],
        responses={200: sz.DiaBoletimSerializer, **ERROS},
    )
    def get(self, request: Request, dia: str) -> Response:
        try:
            data = date.fromisoformat(dia)
        except ValueError:
            raise ConsultaInvalida("Data inválida", {"dia": "Use AAAA-MM-DD"}) from None
        d = validar_consulta(sz.ConsultaDiaSerializer, request)
        corpo = leitura.montar_dia(data, d["origem"], d["todas"] == "1", leitura.hoje())
        return Response(corpo)
