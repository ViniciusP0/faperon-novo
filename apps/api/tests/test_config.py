import pytest

from config.settings import ALLOWED_HOSTS_PADRAO, env_lista


def test_env_lista_descarta_itens_vazios_e_espacos(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("X_LISTA", " a.com , ,b.com, ")
    assert env_lista("X_LISTA") == ["a.com", "b.com"]


def test_env_lista_usa_o_padrao_quando_ausente(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("X_LISTA", raising=False)
    assert env_lista("X_LISTA", "localhost,api") == ["localhost", "api"]
    assert env_lista("X_LISTA") == []


def test_allowed_hosts_padrao_nao_aceita_qualquer_host() -> None:
    hosts = env_lista("NAO_DEFINIDA_NUNCA", ALLOWED_HOSTS_PADRAO)
    assert "*" not in hosts
    assert {"localhost", "127.0.0.1", "api"} <= set(hosts)


def test_chave_igual_ao_placeholder_do_exemplo_gera_aviso_sem_imprimir_o_valor(
    caplog: pytest.LogCaptureFixture,
) -> None:
    from config.settings import SECRET_KEY_EXEMPLO, avisar_chave_fraca

    with caplog.at_level("WARNING"):
        avisar_chave_fraca(SECRET_KEY_EXEMPLO, debug=False)
    assert len(caplog.records) == 1
    assert "DJANGO_SECRET_KEY" in caplog.records[0].getMessage()
    assert SECRET_KEY_EXEMPLO not in caplog.text


def test_chave_propria_ou_debug_nao_gera_aviso(caplog: pytest.LogCaptureFixture) -> None:
    from config.settings import SECRET_KEY_EXEMPLO, avisar_chave_fraca

    with caplog.at_level("WARNING"):
        avisar_chave_fraca("x" * 60, debug=False)
        avisar_chave_fraca(SECRET_KEY_EXEMPLO, debug=True)
    assert caplog.records == []


def test_placeholder_do_env_example_confere_com_a_constante() -> None:
    from pathlib import Path

    from config.settings import BASE_DIR, SECRET_KEY_EXEMPLO

    exemplo = Path(BASE_DIR).parent.parent / ".env.example"
    if exemplo.exists():  # no container só apps/api é montado
        assert f"DJANGO_SECRET_KEY={SECRET_KEY_EXEMPLO}" in exemplo.read_text(encoding="utf-8")
