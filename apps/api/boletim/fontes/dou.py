"""Leitor do Diário Oficial da União (in.gov.br/leiturajornal)."""

import html
import json
import re
import ssl
from datetime import date
from typing import Any

import requests
from requests.adapters import HTTPAdapter

from boletim.fontes import FonteIndisponivel
from boletim.tipos import AtoBruto

URL_LISTA = "https://www.in.gov.br/leiturajornal"
URL_NOTA = "https://www.in.gov.br/web/dou/-/{url_title}"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
TIMEOUT_S = 60

_PARAMS = re.compile(r'<script id="params" type="application/json">(.*?)</script>', re.DOTALL)
_TEXTO_NOTA = re.compile(r'<div class="texto-dou"[^>]*>([\s\S]*?)</div>\s*</div>')
_TAGS = re.compile(r"<[^>]+>")


class _AdaptadorTls12(HTTPAdapter):
    """O in.gov.br só negocia bem com TLS 1.2."""

    def init_poolmanager(self, *args: Any, **kwargs: Any) -> None:
        contexto = ssl.create_default_context()
        contexto.minimum_version = ssl.TLSVersion.TLSv1_2
        contexto.maximum_version = ssl.TLSVersion.TLSv1_2
        kwargs["ssl_context"] = contexto
        super().init_poolmanager(*args, **kwargs)


def _sessao_tls12() -> requests.Session:
    sessao = requests.Session()
    sessao.mount("https://", _AdaptadorTls12())
    return sessao


def ler_pagina_dou(html: str, dia: date, secao: str) -> list[AtoBruto]:
    """Extrai os atos do JSON embutido em <script id="params">."""
    achado = _PARAMS.search(html)
    if achado is None:
        raise FonteIndisponivel("Página do DOU sem o bloco params")
    try:
        itens = json.loads(achado.group(1))["jsonArray"]
    except (ValueError, KeyError, TypeError) as erro:
        raise FonteIndisponivel(f"JSON do DOU ilegível: {erro}") from erro

    if not isinstance(itens, list):
        raise FonteIndisponivel("jsonArray do DOU não é uma lista")

    atos = []
    for item in itens:
        if not isinstance(item, dict) or not item.get("urlTitle"):
            continue  # sem urlTitle não há id_externo nem url
        pagina = str(item.get("numberPage") or "")
        atos.append(
            AtoBruto(
                fonte="dou",
                id_externo=item["urlTitle"],
                dia=dia,
                edicao=str(item.get("editionNumber") or ""),
                secao=secao.lower(),
                orgao=item.get("hierarchyStr") or "",
                titulo=item.get("title") or "",
                texto=(item.get("content") or "").strip(),
                url=URL_NOTA.format(url_title=item["urlTitle"]),
                pagina=int(pagina) if pagina.isdigit() else None,
            )
        )
    return atos


def baixar_dou(dia: date, secao: str, http: Any = None) -> list[AtoBruto]:
    """Baixa a seção do dia e devolve os atos; erro de rede ou HTTP vira FonteIndisponivel."""
    cliente = http if http is not None else _sessao_tls12()
    params = {"data": dia.strftime("%d-%m-%Y"), "secao": secao.lower()}
    try:
        resposta = cliente.get(
            URL_LISTA,
            params=params,
            headers={"User-Agent": USER_AGENT},
            timeout=TIMEOUT_S,
        )
    except requests.RequestException as erro:
        raise FonteIndisponivel(f"Falha de rede no DOU: {erro}") from erro
    if resposta.status_code >= 400:
        raise FonteIndisponivel(f"DOU respondeu HTTP {resposta.status_code}")
    return ler_pagina_dou(resposta.content.decode("utf-8", errors="replace"), dia, secao)


def baixar_texto_nota(url: str, http: Any = None) -> str:
    """Baixa a página de uma nota do DOU e devolve só o texto do ato, sem tags."""
    cliente = http if http is not None else _sessao_tls12()
    try:
        resposta = cliente.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_S)
    except requests.RequestException as erro:
        raise FonteIndisponivel(f"Falha de rede no DOU: {erro}") from erro
    if resposta.status_code >= 400:
        raise FonteIndisponivel(f"DOU respondeu HTTP {resposta.status_code}")
    pagina = resposta.content.decode("utf-8", errors="replace")
    achado = _TEXTO_NOTA.search(pagina)
    if achado is None:
        raise FonteIndisponivel("Nota do DOU sem o bloco texto-dou")
    texto = html.unescape(_TAGS.sub(" ", achado.group(1)))
    return " ".join(texto.split())
