"""Cliente HTTP da API de agregados v3 do IBGE, com retry e backoff."""

import logging
import time
from collections.abc import Callable
from typing import Any

import requests

log = logging.getLogger(__name__)

BASE_URL = "https://servicodados.ibge.gov.br/api/v3/agregados"
LOCALIDADES_RO = "N6[N3[11]]"  # municípios de Rondônia


class ErroSidra(Exception):
    pass


class ErroSidraDefinitivo(ErroSidra):
    """Erro 4xx (exceto 429): repetir não adianta."""


class SidraCliente:
    def __init__(
        self,
        sessao: requests.Session | None = None,
        tentativas: int = 5,
        espera_base: float = 2.0,
        dormir: Callable[[float], None] = time.sleep,
        timeout: float = 120.0,
    ) -> None:
        self.sessao = sessao or requests.Session()
        self.tentativas = tentativas
        self.espera_base = espera_base
        self.dormir = dormir
        self.timeout = timeout

    def _get(self, url: str) -> Any:
        ultimo_erro: Exception | None = None
        for tentativa in range(1, self.tentativas + 1):
            try:
                resposta = self.sessao.get(url, timeout=self.timeout)
                if resposta.status_code == 429 or resposta.status_code >= 500:
                    raise ErroSidra(f"HTTP {resposta.status_code} em {url}")
                if resposta.status_code >= 400:
                    raise ErroSidraDefinitivo(f"HTTP {resposta.status_code} em {url}")
                return resposta.json()
            except ErroSidraDefinitivo:
                raise
            except (requests.RequestException, ValueError, ErroSidra) as exc:
                ultimo_erro = exc
            if tentativa < self.tentativas:
                espera = self.espera_base * (2 ** (tentativa - 1))
                log.warning(
                    "SIDRA falhou (%s); tentativa %s, nova tentativa em %.0fs",
                    ultimo_erro,
                    tentativa,
                    espera,
                )
                self.dormir(espera)
        raise ErroSidra(f"SIDRA indisponível após {self.tentativas} tentativas: {ultimo_erro}")

    def categorias(self, tabela: int, classificacao: int) -> list[tuple[str, str]]:
        meta = self._get(f"{BASE_URL}/{tabela}/metadados")
        for classe in meta["classificacoes"]:
            if int(classe["id"]) == classificacao:
                return [(str(c["id"]), c["nome"]) for c in classe["categorias"]]
        raise ErroSidraDefinitivo(f"Classificação {classificacao} não existe na tabela {tabela}")

    def dados(
        self, tabela: int, variaveis: tuple[str, ...], classificacao: int | None, categoria: str
    ) -> list[dict[str, Any]]:
        url = (
            f"{BASE_URL}/{tabela}/periodos/all/variaveis/{'|'.join(variaveis)}"
            f"?localidades={LOCALIDADES_RO}"
        )
        if classificacao is not None:
            url += f"&classificacao={classificacao}[{categoria}]"
        resposta = self._get(url)
        if not isinstance(resposta, list):
            raise ErroSidraDefinitivo(f"Resposta inesperada para {url}")
        return resposta

    def serie_nacional(self, tabela: int, variavel: str) -> list[dict[str, Any]]:
        url = f"{BASE_URL}/{tabela}/periodos/all/variaveis/{variavel}?localidades=N1[all]"
        resposta = self._get(url)
        if not isinstance(resposta, list):
            raise ErroSidraDefinitivo(f"Resposta inesperada para {url}")
        return resposta
