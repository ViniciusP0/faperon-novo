"""Cliente de LLM roteirizado para testar o Zétele sem rede."""

import copy
import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Bloco:
    type: str
    text: str = ""
    id: str = ""
    name: str = ""
    input: dict[str, Any] = field(default_factory=dict)


@dataclass
class Uso:
    input_tokens: int = 10
    output_tokens: int = 5
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0


@dataclass
class RespostaFalsa:
    stop_reason: str
    content: list[Bloco]
    usage: Uso = field(default_factory=Uso)


class ClienteLLMFalso:
    def __init__(self, roteiro: list[RespostaFalsa | Exception]) -> None:
        self.roteiro = list(roteiro)
        self.pedidos: list[dict[str, Any]] = []

    def criar(self, **kwargs: Any) -> RespostaFalsa:
        self.pedidos.append(copy.deepcopy(kwargs))
        item = self.roteiro.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def final(tipo: str, texto: str, sugestoes: tuple[str, ...] = ()) -> RespostaFalsa:
    corpo = json.dumps({"tipo": tipo, "texto": texto, "sugestoes": list(sugestoes)}, ensure_ascii=False)
    return RespostaFalsa("end_turn", [Bloco("text", text=corpo)])


def ferramenta(nome: str, entrada: dict[str, Any], id: str = "t1") -> RespostaFalsa:
    return RespostaFalsa("tool_use", [Bloco("tool_use", id=id, name=nome, input=entrada)])
