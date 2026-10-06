from typing import Any

from rest_framework import status
from rest_framework.exceptions import Throttled, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

from indicadores.erros import ConsultaInvalida, NaoEncontrado, RecorteIncompativel, ServicoOcupado

RETRY_AFTER_OCUPADO = 30  # segundos sugeridos ao cliente quando a renderização está ocupada


def _campos(detalhe: Any) -> dict[str, str]:
    if not isinstance(detalhe, dict):
        return {}
    campos: dict[str, str] = {}
    for chave, valor in detalhe.items():
        texto = valor[0] if isinstance(valor, list) and valor else valor
        campos[str(chave)] = str(texto)
    return campos


def tratador_de_excecoes(exc: Exception, contexto: dict[str, Any]) -> Response | None:
    """Formato único de erro: {"erro": "...", "campos": {...}}."""
    if isinstance(exc, NaoEncontrado):
        return Response({"erro": str(exc), "campos": {}}, status=status.HTTP_404_NOT_FOUND)
    if isinstance(exc, ConsultaInvalida):
        return Response(
            {"erro": str(exc), "campos": exc.campos}, status=status.HTTP_400_BAD_REQUEST
        )
    if isinstance(exc, RecorteIncompativel):
        return Response(
            {"erro": str(exc), "campos": {}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY
        )
    if isinstance(exc, ServicoOcupado):
        resposta_503 = Response(
            {"erro": str(exc), "campos": {}}, status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
        resposta_503["Retry-After"] = str(RETRY_AFTER_OCUPADO)
        return resposta_503
    resposta = exception_handler(exc, contexto)
    if resposta is None:
        return None
    if isinstance(exc, ValidationError):
        resposta.data = {"erro": "Parâmetros inválidos", "campos": _campos(exc.detail)}
    elif isinstance(exc, Throttled):
        resposta.data = {
            "erro": "Limite de requisições excedido; tente novamente em instantes",
            "campos": {},
        }
    else:
        detalhe = resposta.data.get("detail", "Erro") if isinstance(resposta.data, dict) else "Erro"
        resposta.data = {"erro": str(detalhe), "campos": {}}
    return resposta
