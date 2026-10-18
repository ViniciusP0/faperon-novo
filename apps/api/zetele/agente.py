"""Laço do Zétele: ferramentas → resposta → conferência → reserva determinística (ADR 0029)."""

import json
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from zetele import ferramentas, prompt, verificacao
from zetele.canais import PUBLICO, Canal
from zetele.cliente import ClienteLLM, TempoEsgotado
from zetele.ferramentas import ResultadoFerramenta
from zetele.rag import Trecho, recuperador_do_canal

log = logging.getLogger(__name__)

MAX_RODADAS = 3
MAX_CHAMADAS = 4
ORCAMENTO_SEGUNDOS = 40.0
MAX_HISTORICO = 6
# Quantos trechos da base (RAG) vão com cada pergunta.
LIMITE_TRECHOS = 6
# No Início o Zétele só orienta para as áreas do site; dados e preços ficam na Central.
ORIENTACAO_INICIO = (
    "Nesta página o Zétele só orienta para onde ir no site: não consulte dados nem cite números; "
    "para números e preços, indique a Central de Inteligência."
)


@dataclass(frozen=True)
class Textos:
    recusa: str
    demora: str
    sem_confirmacao: str


TEXTOS = {
    "publico": Textos(
        recusa="Isso eu não sei responder. Posso ajudar com o Painel, o Observatório ou as páginas da FAPERON.",
        demora="Demorei demais para consultar os dados. Tente de novo ou abra o Painel Agro Analítico.",
        sem_confirmacao="Não consegui confirmar essa informação. Para números, use o Painel Agro Analítico.",
    ),
    "sistema": Textos(
        recusa="Isso eu não sei responder. Posso ajudar com a agenda, a frota, os espaços, as contas, "
        "as atividades e os relatórios.",
        demora="Demorei demais para responder. Tente de novo em instantes.",
        sem_confirmacao="Não consegui confirmar essa informação. Veja o módulo no menu do sistema.",
    ),
}
# compatibilidade: os textos do canal público seguem com os nomes antigos
TEXTO_RECUSA = TEXTOS["publico"].recusa
TEXTO_DEMORA = TEXTOS["publico"].demora
TEXTO_SEM_CONFIRMACAO = TEXTOS["publico"].sem_confirmacao


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


def _mensagens(
    historico: list[dict[str, str]],
    pergunta: str,
    pagina: str,
    trechos: list[Trecho] | None = None,
) -> list[dict[str, Any]]:
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
    aviso = f" {ORIENTACAO_INICIO}" if pagina == "/" else ""
    atual = f"(O visitante está em {pagina}.{aviso})\n\n{pergunta}"
    if trechos:
        atual = f"{prompt.contexto(trechos)}\n\n{atual}"
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
        return {
            **base,
            "content": "Limite de consultas desta pergunta atingido. Responda com o que já tem.",
            "is_error": True,
        }
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
    canal: Canal = PUBLICO,
    relogio: Callable[[], float] = time.monotonic,
) -> Resposta:
    inicio = relogio()
    textos = TEXTOS[canal.nome]
    base = recuperador_do_canal(canal.nome)
    # a pergunta anterior ajuda a achar o assunto de um "e como cancelo?"
    anterior = next((h["texto"] for h in reversed(historico) if h["papel"] == "visitante"), "")
    trechos = base.buscar(f"{anterior} {pergunta}", pagina, LIMITE_TRECHOS)
    system = prompt.system_atual(canal)
    messages = _mensagens(historico, pergunta, pagina, trechos)
    ferramentas_da_pagina = [] if pagina in canal.so_orientacao else ferramentas.DEFINICOES
    resultados: list[ResultadoFerramenta] = []
    tokens = [0, 0]
    chamadas = 0

    def reserva(status: str, padrao: str) -> Resposta:
        texto = " ".join(r.resumo for r in resultados[:2]) if resultados else padrao
        return Resposta(status, texto, _fontes(resultados), [], tokens[0], tokens[1])

    for rodada in range(MAX_RODADAS):
        if relogio() - inicio > ORCAMENTO_SEGUNDOS:
            return reserva("erro", textos.demora)
        try:
            r = cliente.criar(
                system=system,
                messages=messages,
                tools=ferramentas_da_pagina,
                ultima_rodada=rodada == MAX_RODADAS - 1,
            )
        except TempoEsgotado:
            return reserva("erro", textos.demora)
        uso_tokens = r.usage
        tokens[0] += (
            uso_tokens.input_tokens
            + (uso_tokens.cache_read_input_tokens or 0)
            + (uso_tokens.cache_creation_input_tokens or 0)
        )
        tokens[1] += uso_tokens.output_tokens
        if r.stop_reason == "refusal":
            return Resposta("recusada", textos.recusa, [], [], tokens[0], tokens[1])
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
                return reserva("erro", textos.sem_confirmacao)
            messages.append({"role": "user", "content": blocos})
            continue
        tipo, texto, sugestoes = _ler_final(r)
        if tipo == "recusa":
            return Resposta("recusada", texto or textos.recusa, [], sugestoes, tokens[0], tokens[1])
        v = verificacao.verificar(
            texto,
            dados=[res.dados for res in resultados],
            referencias=[base.texto_completo(), pergunta, *(h["texto"] for h in historico)],
            urls_ferramentas=set().union(*(res.urls for res in resultados)),
        )
        if v.links_removidos:
            log.info("zetele: %s link(s) removido(s) da resposta", v.links_removidos)
        if not v.aprovada or not v.texto:
            log.warning("zetele: conferência reprovou a resposta: %s", "; ".join(v.motivos))
            return reserva("verificacao_falhou", textos.sem_confirmacao)
        return Resposta("respondida", v.texto, _fontes(resultados), sugestoes, tokens[0], tokens[1])
    return reserva("verificacao_falhou", textos.sem_confirmacao)
