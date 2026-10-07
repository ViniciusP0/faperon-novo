from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class PanoramaView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)


class CrescimentoView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)


class TerritorioView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)


class PecuariaView(APIView):
    def get(self, request: Request) -> Response:
        return Response(status=501)
