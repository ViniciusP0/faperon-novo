"""Anti-Corruption Layer: traduz respostas do SIDRA para a linguagem do domínio."""

from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from indicadores.models import StatusValor

TOKENS_INEXISTENTE = {"-", "..", "...", ""}
TOKEN_SIGILOSO = "X"  # noqa: S105  # marca de sigilo do IBGE, não é senha


@dataclass(frozen=True)
class Registro:
    variavel_codigo: str
    unidade: str
    categoria_codigo: str
    categoria_nome: str
    municipio_codigo: str
    municipio_nome: str
    ano: int
    valor: Decimal | None
    status: str


def interpretar_valor(token: Any) -> tuple[Decimal | None, str]:
    """'X' é sigiloso; '-', '..', '...' são inexistentes; nunca viram zero."""
    if token is None:
        return None, StatusValor.INEXISTENTE
    texto = str(token).strip()
    if texto.upper() == TOKEN_SIGILOSO:
        return None, StatusValor.SIGILOSO
    if texto in TOKENS_INEXISTENTE:
        return None, StatusValor.INEXISTENTE
    try:
        return Decimal(texto), StatusValor.OK
    except InvalidOperation:
        return None, StatusValor.INEXISTENTE


def nome_do_municipio(nome_sidra: str) -> str:
    return nome_sidra.removesuffix(" - RO").strip()


def limpar_nome_produto(nome: str) -> str:
    return nome.rstrip("* ").strip()


def parsear_dados(
    resposta: list[dict[str, Any]], categoria_padrao: tuple[str, str] | None = None
) -> Iterator[Registro]:
    for variavel in resposta:
        codigo = str(variavel["id"])
        unidade = variavel.get("unidade", "")
        for resultado in variavel["resultados"]:
            if resultado["classificacoes"]:
                categorias = resultado["classificacoes"][0]["categoria"]
                ((cat_codigo, cat_nome),) = categorias.items()
            elif categoria_padrao is not None:
                cat_codigo, cat_nome = categoria_padrao
            else:
                raise ValueError(f"Variável {codigo} veio sem classificação e sem categoria padrão")
            for serie in resultado["series"]:
                localidade = serie["localidade"]
                for ano, token in serie["serie"].items():
                    valor, status = interpretar_valor(token)
                    yield Registro(
                        variavel_codigo=codigo,
                        unidade=unidade,
                        categoria_codigo=str(cat_codigo),
                        categoria_nome=cat_nome,
                        municipio_codigo=str(localidade["id"]),
                        municipio_nome=nome_do_municipio(localidade["nome"]),
                        ano=int(ano),
                        valor=valor,
                        status=status,
                    )
