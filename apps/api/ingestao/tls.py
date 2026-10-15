"""Sessão HTTP que completa a cadeia de certificados do servicodados.ibge.gov.br.

O servidor do IBGE envia só o certificado da folha, sem o intermediário
"Sectigo Public Server Authentication CA DV R36". Navegadores baixam o que
falta; o OpenSSL do Python não, e a verificação falha com "unable to get
local issuer certificate". Em vez de desligar a verificação, o intermediário
(público, em certs/) entra no repositório de confiança ao lado dos
certificados raiz do certifi.
"""

import ssl
from pathlib import Path
from typing import Any

import certifi
import requests
from requests.adapters import HTTPAdapter

INTERMEDIARIO_IBGE = Path(__file__).parent / "certs" / "sectigo-dv-r36.pem"


class _AdaptadorCadeiaIbge(HTTPAdapter):
    def init_poolmanager(self, *args: Any, **kwargs: Any) -> None:
        contexto = ssl.create_default_context(cafile=certifi.where())
        contexto.load_verify_locations(cafile=str(INTERMEDIARIO_IBGE))
        kwargs["ssl_context"] = contexto
        super().init_poolmanager(*args, **kwargs)


def sessao_ibge() -> requests.Session:
    sessao = requests.Session()
    sessao.mount("https://servicodados.ibge.gov.br", _AdaptadorCadeiaIbge())
    return sessao
