from pathlib import Path

import pytest
from django.conf import settings


def test_limites_do_zetele_configurados() -> None:
    taxas = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    assert taxas["zetele"] == "6/min"
    assert taxas["zetele_global"] == "30/min"
    assert settings.ZETELE_LIMITE_DIARIO == 600
    assert settings.ZETELE_SISTEMA_LIMITE_DIARIO == 750
    assert taxas["zetele_sistema"] == "10/min"
    assert taxas["zetele_sistema_global"] == "30/min"
    assert settings.ZETELE_SIMULTANEOS == 3
    assert "zetele" in settings.INSTALLED_APPS


def test_testes_comuns_nunca_veem_a_chave_real() -> None:
    assert settings.ANTHROPIC_API_KEY == ""


def test_env_example_documenta_os_limites_sem_a_chave() -> None:
    from config.settings import BASE_DIR

    exemplo = Path(BASE_DIR).parent.parent / ".env.example"
    if not exemplo.exists():  # no container só apps/api é montado
        pytest.skip(".env.example fica fora do container; a checagem roda no CI")
    texto = exemplo.read_text(encoding="utf-8")
    for nome in (
        "ZETELE_RATE_LIMIT",
        "ZETELE_GLOBAL_RATE_LIMIT",
        "ZETELE_LIMITE_DIARIO",
        "ZETELE_SISTEMA_LIMITE_DIARIO",
        "ZETELE_SISTEMA_RATE_LIMIT",
        "ZETELE_SISTEMA_GLOBAL_RATE_LIMIT",
        "ZETELE_SIMULTANEOS",
    ):
        assert f"{nome}=" in texto
    assert "ANTHROPIC_API_KEY=" not in texto  # o segredo fica só no .env.local
