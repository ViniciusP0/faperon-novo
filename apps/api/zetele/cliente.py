"""Única peça que conhece o SDK da Anthropic. O agente só vê ClienteLLM."""

from typing import Any, Protocol

import anthropic

FORMATO: dict[str, Any] = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {
            "tipo": {"type": "string", "enum": ["resposta", "recusa", "sem_informacao"]},
            "texto": {"type": "string"},
            "sugestoes": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["tipo", "texto", "sugestoes"],
        "additionalProperties": False,
    },
}


class TempoEsgotado(Exception):
    """A chamada passou do timeout do cliente."""


class PedidoRecusado(Exception):
    """A Anthropic recusou o pedido (4xx que não é limite de taxa): erro deste pedido, não do provedor."""


class ProvedorIndisponivel(Exception):
    """Anthropic fora, sem crédito, limite de taxa ou erro de rede: o Zétele descansa um pouco."""


class ClienteLLM(Protocol):
    def criar(
        self,
        *,
        system: list[dict[str, Any]],
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        ultima_rodada: bool,
        formato: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any: ...


class ClienteAnthropic:
    def __init__(self, chave: str, modelo: str) -> None:
        self._cliente = anthropic.Anthropic(api_key=chave, timeout=20.0, max_retries=1)
        self._modelo = modelo

    def criar(
        self,
        *,
        system: list[dict[str, Any]],
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        ultima_rodada: bool,
        formato: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """`formato` troca a saída estruturada padrão (resposta do Zétele) por outra, como a do
        agendamento por voz. `timeout` limita esta chamada ao que resta do orçamento do agente."""
        parametros: dict[str, Any] = {
            "model": self._modelo,
            "max_tokens": 1500,
            "system": system,
            "messages": messages,
            "thinking": {"type": "adaptive"},
            "output_config": {"effort": "low", "format": formato or FORMATO},
            # recusa por engano de um classificador é refeita no servidor (Claude API)
            "betas": ["server-side-fallback-2026-07-01"],
            "fallbacks": "default",
        }
        if tools:  # no Início não há ferramentas (só orientação)
            parametros["tools"] = tools
            # Sonnet 5.5 recusa tool_choice any/tool (400); na última rodada, "none" força a resposta
            parametros["tool_choice"] = {"type": "none"} if ultima_rodada else {"type": "auto"}
        if timeout is not None:
            parametros["timeout"] = timeout
        try:
            return self._cliente.beta.messages.create(**parametros)
        except anthropic.APITimeoutError as exc:
            raise TempoEsgotado from exc
        except anthropic.RateLimitError as exc:
            raise ProvedorIndisponivel("limite de taxa da Anthropic") from exc
        except anthropic.APIStatusError as exc:
            # só 5xx (e 529, sobrecarga) abrem o disjuntor; um 400 deste pedido não derruba o assistente
            if exc.status_code >= 500:
                raise ProvedorIndisponivel(f"HTTP {exc.status_code}") from exc
            raise PedidoRecusado(f"HTTP {exc.status_code}") from exc
        except anthropic.APIConnectionError as exc:
            raise ProvedorIndisponivel("falha de conexão") from exc
