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
# Cabeçalho de órgão: caixa-alta, começa por palavra institucional e termina em " - SIGLA".
_PREFIXOS_ORGAO = (
    "SECRETARIA", "SUPERINTENDÊNCIA", "AGÊNCIA", "DEPARTAMENTO", "FUNDAÇÃO", "INSTITUTO",
    "POLÍCIA", "PROCURADORIA", "CONTROLADORIA", "CORPO DE", "HOSPITAL", "LABORATÓRIO",
    "JUNTA", "ENTIDADE", "TRIBUNAL", "DEFENSORIA", "ASSEMBLEIA", "MINISTÉRIO",
)  # fmt: skip
_ORGAO = re.compile(r"^(?:" + "|".join(_PREFIXOS_ORGAO) + r")\b.* - ([A-Z0-9]{2,12})$")
_CARGOS = {"GERENTE", "DIRETOR", "DIRETORA", "PRESIDENTE", "SECRETÁRIO", "SECRETARIA", "ME", "EPP"}
_INICIO_ORGAO = re.compile(r"^(?:" + "|".join(_PREFIXOS_ORGAO) + r")\b")


def url_pdf(dia: date, sufixo: str = "") -> str:
    """URL do PDF da edição; sufixo "X-" vai antes da data, "-X" depois."""
    antes = "" if sufixo.startswith("-") else sufixo
    depois = sufixo if sufixo.startswith("-") else ""
    nome = f"DOE-{antes}{dia.strftime('%d-%m-%Y')}{depois}.pdf"
    return f"{URL_BASE}/{dia:%Y}/{dia:%m}/{nome}"


def _eh_orgao(linha: str) -> bool:
    """Cabeçalho institucional com sigla; descarta empresas, cargos e linhas com ':' ou '('."""
    if len(linha) < 10 or linha != linha.upper() or any(c in linha for c in ":("):
        return False
    if "LTDA" in linha:
        return False
    achado = _ORGAO.match(linha)
    return achado is not None and achado.group(1) not in _CARGOS


def _titulo(linhas: list[str]) -> str:
    """Primeira linha útil; pula "AVISO" sozinho e colapsa palavra inicial repetida."""
    if linhas and linhas[0].upper() == "AVISO" and len(linhas) > 1:
        titulo = linhas[1]
    else:
        titulo = linhas[0] if linhas else ""
    palavras = titulo.split(" ", 2)
    if len(palavras) == 3 and palavras[0].upper() == palavras[1].upper():
        return palavras[1] + " " + palavras[2]
    return titulo


def dividir_edicao(texto: str, dia: date, url: str) -> list[AtoBruto]:
    """Divide o texto do PDF em atos. Cada ato termina em "Protocolo N".

    Um cabeçalho de órgão também fecha o ato anterior (quando o Protocolo não
    saiu no texto); nesse caso o id_externo é um hash do conteúdo. Sobra sem
    Protocolo no fim do texto é descartada (pode estar truncada).
    """
    achado = _RODAPE.search(texto or "")
    edicao = achado.group(1) if achado else ""
    ultimo_rodape = 0  # número do último rodapé visto; o rodapé N fecha a página N
    orgao = ""
    linhas: list[str] = []
    pagina_ato: int | None = None
    atos: list[AtoBruto] = []

    def fechar(id_externo: str | None) -> None:
        nonlocal linhas, pagina_ato
        if linhas and not linhas[0].upper().startswith("SUMÁRIO"):
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
                    pagina=pagina_ato,
                )
            )
        linhas = []
        pagina_ato = None

    def acrescentar(linha: str) -> None:
        nonlocal pagina_ato
        if not linhas:
            pagina_ato = ultimo_rodape + 1  # página onde o ato começa
        linhas.append(linha)

    todas = (texto or "").splitlines()
    i = 0
    while i < len(todas):
        linha = todas[i].strip()
        i += 1
        rodape = _RODAPE.search(linha)
        if rodape:
            ultimo_rodape = int(rodape.group(2))
            linha = (linha[: rodape.start()] + " " + linha[rodape.end() :]).strip()
        if _AUTENTICIDADE.match(linha) or _LINHA_DATA.match(linha):
            continue
        # Cabeçalho que quebra em duas linhas: junta com a continuação.
        if linha.endswith(",") and linha == linha.upper() and _INICIO_ORGAO.match(linha):
            while i < len(todas) and not todas[i].strip():
                i += 1
            if i < len(todas):
                linha = linha + " " + todas[i].strip()
                i += 1
        protocolo = _PROTOCOLO.search(linha)
        if protocolo:
            linha = linha[: protocolo.start()].strip()
            if linha:
                acrescentar(linha)
            fechar(protocolo.group(1))
        elif _eh_orgao(linha):
            fechar(None)
            orgao = linha
        elif linha:
            acrescentar(linha)
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
