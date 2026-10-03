from typing import Any

from rest_framework import serializers
from rest_framework.request import Request


def validar_consulta(serializer_class: type[serializers.Serializer], request: Request) -> dict[str, Any]:
    serializer = serializer_class(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return dict(serializer.validated_data)


def lista_csv(texto: str | None) -> list[str]:
    return [t.strip() for t in (texto or "").split(",") if t.strip()]
