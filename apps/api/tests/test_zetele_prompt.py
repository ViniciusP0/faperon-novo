from typing import Any

import pytest

from indicadores.models import Produto
from zetele.conhecimento import BaseEstatica, ler_secoes, texto_da_base
from zetele.prompt import PERSONA, catalogo_texto, montar_system, system_atual


def test_le_secoes_com_rota_e_sem_rota() -> None:
    trechos = ler_secoes("## [/painel] Painel\nTexto A\n\n## [-] Geral\nTexto B\n")
    assert trechos == [
        {"titulo": "Painel", "rota": "/painel", "texto": "Texto A"},
        {"titulo": "Geral", "rota": None, "texto": "Texto B"},
    ]


def test_base_real_carrega_as_rotas_principais() -> None:
    rotas = {t["rota"] for t in BaseEstatica().trechos("", limite=1000)}
    assert {
        "/",
        "/painel",
        "/central-de-inteligencia",
        "/central-de-inteligencia/observatorio",
    } <= rotas
    assert "(69) 3214-8371" in texto_da_base()


def test_persona_proibe_numero_sem_ferramenta_e_pede_json() -> None:
    assert "Zétele" in PERSONA
    assert "use as ferramentas" in PERSONA
    assert "tipo" in PERSONA and "sugestoes" in PERSONA


def test_system_poe_o_breakpoint_de_cache_no_ultimo_bloco() -> None:
    blocos = montar_system([{"titulo": "T", "rota": "/", "texto": "x"}], "catálogo")
    assert [("cache_control" in b) for b in blocos] == [False, False, True]
    assert blocos[0]["text"] == PERSONA


@pytest.mark.django_db
def test_catalogo_lista_slugs_em_ordem_fixa(dados_soja: Produto) -> None:
    texto = catalogo_texto()
    assert "soja-em-grao" in texto
    assert "quantidade-produzida" in texto
    assert "1100023 Ariquemes" in texto
    assert texto == catalogo_texto()


@pytest.mark.django_db
def test_system_e_identico_byte_a_byte_entre_montagens(dados_soja: Produto) -> None:
    """Qualquer byte diferente invalida o cache do prompt."""
    a: list[dict[str, Any]] = system_atual()
    b: list[dict[str, Any]] = system_atual()
    assert a == b
