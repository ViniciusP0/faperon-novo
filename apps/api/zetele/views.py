import logging
import threading
from typing import Any, cast

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from zetele import agente, disponibilidade, registro
from zetele.cliente import ClienteAnthropic, ClienteLLM, ProvedorIndisponivel
from zetele.models import Pergunta
from zetele.throttles import ZeteleGlobalThrottle

log = logging.getLogger(__name__)

PAGINAS_COM_ZETELE = ("/", "/central-de-inteligencia", "/central-de-inteligencia/observatorio", "/painel")
# Uma pergunta prende uma thread do gunicorn por até 40 s: no máximo N por processo (ADR 0025).
SEMAFORO = threading.BoundedSemaphore(settings.ZETELE_SIMULTANEOS)
MENSAGENS = {
    "sem_chave": "O assistente está desligado; use as perguntas prontas.",
    "orcamento_diario": "O assistente atingiu o limite de hoje; use as perguntas prontas.",
    "indisponivel": "O assistente está indisponível no momento; tente de novo em instantes.",
    "ocupado": "O assistente está atendendo muitas pessoas; tente de novo em instantes.",
}
RETRY = {"sem_chave": 3600, "orcamento_diario": 3600, "indisponivel": 60, "ocupado": 10}


def obter_cliente() -> ClienteLLM:
    return ClienteAnthropic(settings.ANTHROPIC_API_KEY, settings.ZETELE_MODELO)


class MensagemSerializer(serializers.Serializer):
    papel = serializers.ChoiceField(choices=["visitante", "zetele"])
    texto = serializers.CharField(max_length=1200)


class PerguntaSerializer(serializers.Serializer):
    pergunta = serializers.CharField(max_length=500)
    historico = MensagemSerializer(many=True, required=False, default=list)
    pagina = serializers.ChoiceField(choices=PAGINAS_COM_ZETELE)

    def validate_historico(self, valor: list[dict[str, str]]) -> list[dict[str, str]]:
        if len(valor) > 6:
            raise serializers.ValidationError("No máximo 6 mensagens.")
        return valor


class EstadoSerializer(serializers.Serializer):
    disponivel = serializers.BooleanField()
    motivo = serializers.CharField(allow_null=True)


class FonteSerializer(serializers.Serializer):
    rotulo = serializers.CharField()
    url_fonte = serializers.CharField()
    url_interna = serializers.CharField(allow_null=True)
    atualizado_em = serializers.CharField(allow_null=True)


class RespostaSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["respondida", "recusada", "erro"])
    texto = serializers.CharField()
    fontes = FonteSerializer(many=True)
    sugestoes = serializers.ListField(child=serializers.CharField())


def _indisponivel(motivo: str) -> Response:
    r = Response({"erro": MENSAGENS[motivo], "motivo": motivo}, status=503)
    r["Retry-After"] = str(RETRY[motivo])
    return r


class EstadoView(APIView):
    @extend_schema(responses={200: EstadoSerializer})
    def get(self, request: Request) -> Response:
        return Response(disponibilidade.estado())


class PerguntarView(APIView):
    throttle_classes = [ScopedRateThrottle, ZeteleGlobalThrottle]
    throttle_scope = "zetele"

    def check_throttles(self, request: Request) -> None:
        """Para no primeiro limite que recusa: pedido barrado por IP não gasta o teto global."""
        for throttle in self.get_throttles():
            if not throttle.allow_request(request, self):
                self.throttled(request, cast(float, throttle.wait()))

    @extend_schema(request=PerguntaSerializer, responses={200: RespostaSerializer})
    def post(self, request: Request) -> Response:
        entrada = PerguntaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        d: dict[str, Any] = dict(entrada.validated_data)
        pergunta, pagina = d["pergunta"], d["pagina"]
        historico = [dict(m) for m in d["historico"]]

        situacao = disponibilidade.estado()
        if not situacao["disponivel"]:
            registro.registrar(pergunta, Pergunta.Status.INDISPONIVEL, pagina)
            return _indisponivel(situacao["motivo"])
        if disponibilidade.contar_pergunta() > settings.ZETELE_LIMITE_DIARIO:
            registro.registrar(pergunta, Pergunta.Status.INDISPONIVEL, pagina)
            return _indisponivel("orcamento_diario")
        if not SEMAFORO.acquire(blocking=False):
            return _indisponivel("ocupado")
        try:
            resposta = agente.responder(obter_cliente(), pergunta, historico, pagina)
        except ProvedorIndisponivel as exc:
            log.warning("zetele: provedor indisponível (%s)", exc)
            disponibilidade.abrir_disjuntor()
            registro.registrar(pergunta, Pergunta.Status.ERRO, pagina)
            return _indisponivel("indisponivel")
        finally:
            SEMAFORO.release()

        registro.registrar(
            pergunta, resposta.status, pagina, resposta.tokens_entrada, resposta.tokens_saida
        )
        # a reserva determinística é uma resposta válida: o visitante não precisa saber da falha
        status = "respondida" if resposta.status == "verificacao_falhou" else resposta.status
        return Response(
            {"status": status, "texto": resposta.texto, "fontes": resposta.fontes, "sugestoes": resposta.sugestoes}
        )
