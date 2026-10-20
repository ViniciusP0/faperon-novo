"""Leitor do Diário Oficial de Rondônia (diof.ro.gov.br): PDF diário dividido em atos."""

import hashlib
import re
import subprocess
from collections.abc import Callable
from datetime import date
from typing import Any

import requests

from boletim.fontes import FonteIndisponivel
from boletim.tipos import AtoBruto

URL_BASE = "https://diof.ro.gov.br/data/uploads"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
TIMEOUT_S = 120  # PDFs de ~3 MB
TIMEOUT_PDFTOTEXT_S = 180

_PROTOCOLO = re.compile(r"Protocolo\s+(\d+)\s*$")
_RODAPE = re.compile(r"Rondônia,\s+ed\.\s+(\d+)\s+-\s+(\d+)")
_AUTENTICIDADE = re.compile(r"^Autenticidade pode ser verificada")
_LINHA_DATA = re.compile(r"^(?:\w+-feira|Sábado|Domingo), \d{1,2} de \w+ de \d{4}$", re.IGNORECASE)
# Cabeçalho de órgão: tudo em caixa-alta, terminando em " - SIGLA".
_ORGAO = re.compile(r"^\S.* - [A-Z0-9]{2,}$")


def url_pdf(dia: date, sufixo: str = "") -> str:
    """URL do PDF da edição; sufixo "X-" vai antes da data, "-X" depois."""
    antes = "" if sufixo.startswith("-") else sufixo
    depois = sufixo if sufixo.startswith("-") else ""
    nome = f"DOE-{antes}{dia.strftime('%d-%m-%Y')}{depois}.pdf"
    return f"{URL_BASE}/{dia:%Y}/{dia:%m}/{nome}"


def _eh_orgao(linha: str) -> bool:
    return len(linha) >= 10 and linha == linha.upper() and bool(_ORGAO.match(linha))


def _titulo(linhas: list[str]) -> str:
    """Primeira linha útil; em avisos, a que vem depois da palavra AVISO."""
    if linhas and linhas[0].upper() == "AVISO" and len(linhas) > 1:
        return linhas[1]
    return linhas[0] if linhas else ""


def dividir_edicao(texto: str, dia: date, url: str) -> list[AtoBruto]:
    """Divide o texto do PDF em atos. Cada ato termina em "Protocolo N".

    Um cabeçalho de órgão também fecha o ato anterior (quando o Protocolo não
    saiu no texto); nesse caso o id_externo é um hash do conteúdo. Sobra sem
    Protocolo no fim do texto é descartada (pode estar truncada).
    """
    achado = _RODAPE.search(texto or "")
    edicao = achado.group(1) if achado else ""
    pagina: int | None = int(achado.group(2)) if achado else None
    orgao = ""
    linhas: list[str] = []
    pagina_ato: int | None = None
    atos: list[AtoBruto] = []

    def fechar(id_externo: str | None) -> None:
        nonlocal linhas, pagina_ato
        if linhas:
            corpo = "\n".join(linhas)
            ident = id_externo or "s" + hashlib.sha256(corpo.encode()).hexdigest()[:12]
            atos.append(
                AtoBruto(
                    fonte="doe",
                    id_externo=ident,
                    dia=dia,
                    edicao=edicao,
                    secao="doe",
                    orgao=orgao,
                    titulo=_titulo(linhas),
                    texto=corpo,
                    url=url,
                    pagina=pagina_ato if pagina_ato is not None else pagina,
                )
            )
        linhas = []
        pagina_ato = None

    for bruta in (texto or "").splitlines():
        linha = bruta.strip()
        rodape = _RODAPE.search(linha)
        if rodape:
            pagina = pagina_ato = int(rodape.group(2))
            linha = (linha[: rodape.start()] + " " + linha[rodape.end() :]).strip()
        if _AUTENTICIDADE.match(linha) or _LINHA_DATA.match(linha):
            continue
        protocolo = _PROTOCOLO.search(linha)
        if protocolo:
            linha = linha[: protocolo.start()].strip()
            if linha:
                linhas.append(linha)
            fechar(protocolo.group(1))
        elif _eh_orgao(linha):
            fechar(None)
            orgao = linha
        elif linha:
            linhas.append(linha)
    return atos


def _pdf_para_texto(dados: bytes) -> str:
    """Converte os bytes do PDF em texto com o pdftotext (poppler-utils)."""
    try:
        proc = subprocess.run(
            ["pdftotext", "-enc", "UTF-8", "-", "-"],  # noqa: S607 - comando fixo
            input=dados,
            capture_output=True,
            timeout=TIMEOUT_PDFTOTEXT_S,
            check=True,
        )
    except (OSError, subprocess.SubprocessError) as erro:
        raise FonteIndisponivel(f"pdftotext falhou: {erro}") from erro
    return proc.stdout.decode("utf-8", errors="replace")


def baixar_edicao(
    dia: date,
    http: Any = requests,
    pdf_para_texto: Callable[[bytes], str] = _pdf_para_texto,
    sufixo: str = "",
) -> str | None:
    """Baixa o PDF do dia e devolve o texto; None se a edição ainda não saiu (404)."""
    try:
        resposta = http.get(
            url_pdf(dia, sufixo), headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_S
        )
    except requests.RequestException as erro:
        raise FonteIndisponivel(f"Falha de rede no DOE-RO: {erro}") from erro
    if resposta.status_code == 404:
        return None
    if resposta.status_code >= 400:
        raise FonteIndisponivel(f"DOE-RO respondeu HTTP {resposta.status_code}")
    texto = pdf_para_texto(resposta.content)
    if not texto or not texto.strip():
        raise FonteIndisponivel("PDF do DOE-RO sem texto legível")
    return texto
