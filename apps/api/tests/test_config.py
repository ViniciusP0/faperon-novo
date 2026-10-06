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
