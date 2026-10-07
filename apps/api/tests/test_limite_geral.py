import pytest
from django.conf import settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from indicadores.models import Produto

ROTA = "/api/v1/municipios"


def test_limite_anonimo_geral_esta_configurado() -> None:
    rf = settings.REST_FRAMEWORK
    assert rf["DEFAULT_THROTTLE_CLASSES"] == ["rest_framework.throttling.AnonRateThrottle"]
    assert rf["DEFAULT_THROTTLE_RATES"]["anon"] == "300/min"
    # os escopos do PDF continuam como estavam
    assert rf["DEFAULT_THROTTLE_RATES"]["pdf"] == "10/min"
    assert rf["DEFAULT_THROTTLE_RATES"]["pdf_global"] == "30/min"


@pytest.mark.django_db
def test_excedeu_a_taxa_devolve_429_no_formato_de_erro(
    api: APIClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {"anon": "3/min"})
    cache.clear()
    codigos = [api.get(ROTA, HTTP_X_FORWARDED_FOR="198.51.100.1").status_code for _ in range(4)]
    assert codigos == [200, 200, 200, 429]
    resposta = api.get(ROTA, HTTP_X_FORWARDED_FOR="198.51.100.1")
    assert resposta.status_code == 429
    assert resposta.json() == {
        "erro": "Limite de requisições excedido; tente novamente em instantes",
        "campos": {},
    }
    assert "Retry-After" in resposta
    cache.clear()


@pytest.mark.django_db
def test_identifica_o_cliente_pelo_ultimo_x_forwarded_for(
    api: APIClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """ADR 0023: o primeiro IP da lista é forjável; vale o último (o que o proxy confiável anexou)."""
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {"anon": "2/min"})
    cache.clear()

    def pedir(xff: str) -> int:
        return api.get(ROTA, HTTP_X_FORWARDED_FOR=xff).status_code

    assert [pedir(f"10.0.0.{i}, 198.51.100.7") for i in range(3)] == [200, 200, 429]
    assert pedir("10.0.0.1, 198.51.100.8") == 200
    cache.clear()


@pytest.mark.django_db
def test_navegacao_tipica_nao_chega_perto_do_limite(api: APIClient, dados_soja: Produto) -> None:
    caminhos = [
        "/api/v1/destaques",
        "/api/v1/meta",
        "/api/v1/produtos",
        "/api/v1/indicadores?produto=soja-em-grao",
        "/api/v1/ranking?produto=soja-em-grao&indicador=quantidade-produzida",
        "/api/v1/serie?produto=soja-em-grao&indicador=quantidade-produzida",
        "/api/v1/analise?produto=soja-em-grao&indicador=quantidade-produzida",
        "/api/v1/municipios",
        "/api/v1/ranking?produto=soja-em-grao&indicador=area-colhida",
        "/api/v1/serie?produto=soja-em-grao&indicador=area-colhida",
    ]
    respostas = [api.get(c, HTTP_X_FORWARDED_FOR="198.51.100.9") for c in caminhos]
    assert [r.status_code for r in respostas] == [200] * 10
    assert "Retry-After" not in respostas[-1]
