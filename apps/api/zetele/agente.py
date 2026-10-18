"""Laço do Zétele: ferramentas → resposta → conferência → reserva determinística (ADR 0029)."""

import json
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from zetele import ferramentas, prompt, verificacao
from zetele.cliente import ClienteLLM, TempoEsgotado
from zetele.conhecimento import texto_da_base
from zetele.ferramentas import ResultadoFerramenta

log = logging.getLogger(__name__)

MAX_RODADAS = 3
MAX_CHAMADAS = 4
ORCAMENTO_SEGUNDOS = 40.0
MAX_HISTORICO = 6
# No Início o Zétele só orienta para as áreas do site; dados e preços ficam na Central.
# Na área logada (protótipo) os dados da pessoa ficam no navegador dela: ele só explica o uso.
PAGINAS_SISTEMA = frozenset(
    {
        "/sistema",
        "/sistema/agenda",
        "/sistema/frotas",
        "/sistema/espacos",
        "/sistema/contas",
        "/sistema/relatorios",
        "/sistema/atividades",
    }
)
PAGINAS_SO_ORIENTACAO = frozenset({"/"}) | PAGINAS_SISTEMA
ORIENTACAO_INICIO = (
    "Nesta página o Zétele só orienta para onde ir no site: não consulte dados nem cite números; "
    "para números e preços, indique a Central de Inteligência."
)
ORIENTACAO_SISTEMA = (
    "Esta é a área logada do sistema (protótipo). O Zétele só explica como usar a agenda, a frota, "
    "o agendamento de espaços, o agendamento por voz, a prestação de contas, os relatórios e o registro de atividades; "
    "ele não vê os eventos, reservas, pedidos, despesas ou atividades da pessoa, que ficam no navegador dela. Para "
    "números do agro, indique a Central de Inteligência."
)

TEXTO_RECUSA = "Isso eu não sei responder. Posso ajudar com o Painel, o Observatório ou as páginas da FAPERON."
TEXTO_DEMORA = "Demorei demais para consultar os dados. Tente de novo ou abra o Painel Agro Analítico."
TEXTO_SEM_CONFIRMACAO = "Não consegui confirmar essa informação. Para números, use o Painel Agro Analítico."


@dataclass(frozen=True)
class Resposta:
    status: str
    texto: str
    fontes: list[dict[str, Any]] = field(default_factory=list)
    sugestoes: list[str] = field(default_factory=list)
    tokens_entrada: int = 0
    tokens_saida: int = 0


class _Abortar(Exception):
    """Erro inesperado numa ferramenta: não é culpa do modelo, vai para a reserva."""


def _mensagens(historico: list[dict[str, str]], pergunta: str, pagina: str) -> list[dict[str, Any]]:
    """A API exige começar pelo usuário e alternar papéis: descarta o que sobra e junta repetidos."""
    msgs: list[dict[str, Any]] = []
    for item in historico[-MAX_HISTORICO:]:
        papel = "user" if item["papel"] == "visitante" else "assistant"
        if not msgs and papel == "assistant":
            continue
        if msgs and msgs[-1]["role"] == papel:
            msgs[-1]["content"] += "\n\n" + item["texto"]
        else:
            msgs.append({"role": papel, "content": item["texto"]})
    if pagina in PAGINAS_SISTEMA:
        aviso = f" {ORIENTACAO_SISTEMA}"
    elif pagina in PAGINAS_SO_ORIENTACAO:
        aviso = f" {ORIENTACAO_INICIO}"
    else:
        aviso = ""
    atual = f"(O visitante está em {pagina}.{aviso})\n\n{pergunta}"
    if msgs and msgs[-1]["role"] == "user":
        msgs[-1]["content"] += "\n\n" + atual
    else:
        msgs.append({"role": "user", "content": atual})
    return msgs


def _ler_final(resposta: Any) -> tuple[str, str, list[str]]:
    texto = "".join(b.text for b in resposta.content if getattr(b, "type", None) == "text").strip()
    try:
        corpo = json.loads(texto)
        sugestoes = [str(s).strip()[:120] for s in corpo.get("sugestoes", []) if str(s).strip()][:2]
        return str(corpo["tipo"]), str(corpo["texto"]).strip(), sugestoes
    except (ValueError, KeyError, TypeError, AttributeError):
        if texto.startswith("[RECUSA]"):
            return "recusa", texto.removeprefix("[RECUSA]").strip(), []
        return "resposta", texto, []


def _fontes(resultados: list[ResultadoFerramenta]) -> list[dict[str, Any]]:
    vistas: set[tuple[str, str | None]] = set()
    saida: list[dict[str, Any]] = []
    for r in resultados:
        for f in r.fontes:
            chave = (f["url_fonte"], f["url_interna"])
            if chave not in vistas:
                vistas.add(chave)
                saida.append(f)
    return saida


def _executar(uso: Any, n: int, resultados: list[ResultadoFerramenta]) -> dict[str, Any]:
    base = {"type": "tool_result", "tool_use_id": uso.id}
    if n > MAX_CHAMADAS:
        return {**base, "content": "Limite de consultas desta pergunta atingido. Responda com o que já tem.", "is_error": True}
    try:
        res = ferramentas.executar(uso.name, dict(uso.input))
    except ferramentas.ErroDeFerramenta as exc:
        return {**base, "content": str(exc), "is_error": True}
    except Exception as exc:
        log.exception("zetele: ferramenta %s falhou", uso.name)
        raise _Abortar from exc
    resultados.append(res)
    return {**base, "content": json.dumps(res.dados, ensure_ascii=False, default=str)}


def responder(
    cliente: ClienteLLM,
    pergunta: str,
    historico: list[dict[str, str]],
    pagina: str,
    *,
    relogio: Callable[[], float] = time.monotonic,
) -> Resposta:
    inicio = relogio()
    system = prompt.system_atual()
    messages = _mensagens(historico, pergunta, pagina)
    ferramentas_da_pagina = [] if pagina in PAGINAS_SO_ORIENTACAO else ferramentas.DEFINICOES
    resultados: list[ResultadoFerramenta] = []
    tokens = [0, 0]
    chamadas = 0

    def reserva(status: str, padrao: str) -> Resposta:
        texto = " ".join(r.resumo for r in resultados[:2]) if resultados else padrao
        return Resposta(status, texto, _fontes(resultados), [], tokens[0], tokens[1])

    for rodada in range(MAX_RODADAS):
        if relogio() - inicio > ORCAMENTO_SEGUNDOS:
            return reserva("erro", TEXTO_DEMORA)
        try:
            r = cliente.criar(
                system=system,
                messages=messages,
                tools=ferramentas_da_pagina,
                ultima_rodada=rodada == MAX_RODADAS - 1,
            )
        except TempoEsgotado:
            return reserva("erro", TEXTO_DEMORA)
        uso_tokens = r.usage
        tokens[0] += (
            uso_tokens.input_tokens
            + (uso_tokens.cache_read_input_tokens or 0)
            + (uso_tokens.cache_creation_input_tokens or 0)
        )
        tokens[1] += uso_tokens.output_tokens
        if r.stop_reason == "refusal":
            return Resposta("recusada", TEXTO_RECUSA, [], [], tokens[0], tokens[1])
        usos = [b for b in r.content if getattr(b, "type", None) == "tool_use"]
        if r.stop_reason == "tool_use" and usos:
            # só acréscimo: o content volta inteiro (thinking incluído), sem edição
            messages.append({"role": "assistant", "content": r.content})
            blocos = []
            try:
                for uso in usos:
                    chamadas += 1
                    blocos.append(_executar(uso, chamadas, resultados))
            except _Abortar:
                return reserva("erro", TEXTO_SEM_CONFIRMACAO)
            messages.append({"role": "user", "content": blocos})
            continue
        tipo, texto, sugestoes = _ler_final(r)
        if tipo == "recusa":
            return Resposta("recusada", texto or TEXTO_RECUSA, [], sugestoes, tokens[0], tokens[1])
        v = verificacao.verificar(
            texto,
            dados=[res.dados for res in resultados],
            referencias=[texto_da_base(), pergunta, *(h["texto"] for h in historico)],
            urls_ferramentas=set().union(*(res.urls for res in resultados)),
        )
        if v.links_removidos:
            log.info("zetele: %s link(s) removido(s) da resposta", v.links_removidos)
        if not v.aprovada or not v.texto:
            log.warning("zetele: conferência reprovou a resposta: %s", "; ".join(v.motivos))
            return reserva("verificacao_falhou", TEXTO_SEM_CONFIRMACAO)
        return Resposta("respondida", v.texto, _fontes(resultados), sugestoes, tokens[0], tokens[1])
    return reserva("verificacao_falhou", TEXTO_SEM_CONFIRMACAO)
