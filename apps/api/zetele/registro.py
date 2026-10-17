"""Grava a pergunta mascarada. Nunca guarda IP nem a resposta (ADR 0030)."""

import logging
import re

from django.db import DatabaseError, transaction

from zetele.models import Pergunta

log = logging.getLogger(__name__)

REMOVIDO = "[removido]"
# Ordem importa: e-mail antes de números; CNPJ antes de CPF (o CPF casaria dentro do CNPJ).
# Limites de dígito em todos: sem eles, "2021 12345678" virava "20[removido]".
_PADROES = [
    re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"),
    re.compile(r"(?<!\d)\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}(?!\d)"),
    re.compile(r"(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)"),
    # Com DDD: DDD não tem zero (assim "entre 10 2024-2025" fica); número não começa com 0 ou 1.
    re.compile(r"(?<!\d)\(?[1-9]{2}\)?\s?(?:9\d{4}|[2-9]\d{3})-?\d{4}(?!\d)"),
    # Celular sem DDD, só com hífen. Fixo sem DDD ("3214-8371") fica de fora: tem a mesma forma de
    # um intervalo de anos ("safra 2023-2024").
    re.compile(r"(?<!\d)9\d{4}-\d{4}(?!\d)"),
    re.compile(r"(?<!\d)\d{8,}(?!\d)"),
]


def mascarar(texto: str) -> str:
    for padrao in _PADROES:
        texto = padrao.sub(REMOVIDO, texto)
    return texto[:500]


def registrar(
    texto: str, status: str, pagina: str, tokens_entrada: int = 0, tokens_saida: int = 0
) -> None:
    """Falha ao gravar não derruba a resposta ao visitante."""
    try:
        # savepoint próprio: o erro do INSERT não aborta a transação de quem chamou
        with transaction.atomic():
            Pergunta.objects.create(
                texto=mascarar(texto),
                status=status,
                pagina=pagina[:64],
                tokens_entrada=tokens_entrada,
                tokens_saida=tokens_saida,
            )
    except DatabaseError:
        log.exception("zetele: falha ao registrar a pergunta")
