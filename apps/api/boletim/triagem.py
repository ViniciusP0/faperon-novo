"""Triagem barata dos atos, antes de gastar chamada de IA.

Funcoes puras (sem rede nem banco). Na duvida, deixa o ato passar para a IA;
o objetivo e so cortar o ruido evidente (pessoal e licitacao pequena).
"""

import re
from decimal import Decimal

from django.conf import settings

from boletim.tipos import AtoBruto

_I = re.IGNORECASE

# Ato de pessoal ou de funcionamento interno (titulo): nunca interessa.
PESSOAL = re.compile(
    r"\bpessoal\b|\bpessoas\b|\bnomea(?:r|[çc][ãa]o|[çc][õo]es)\b|"
    r"\bexonera(?:r|[çc][ãa]o|[çc][õo]es)\b|\bdesigna(?:r|[çc][ãa]o|[çc][õo]es)\b|"
    r"\bf[ée]rias\b|\bdi[áa]rias\b|\bfolgas?\b|\bced[êe]ncia\b|\bpromo[çc][ãa]o\b|"
    r"\baposentadorias?\b|\bremarca[çc][ãa]o\b|\bpens[ãa]o\b|\bservidor(?:es|a|as)?\b",
    _I,
)

# No orgao so vale a unidade de pessoal (um "Departamento de Promocao" nao e pessoal).
PESSOAL_ORGAO = re.compile(r"\bpessoal\b|gest[ãa]o de pessoas", _I)

# Verbos de pessoal que so aparecem no inicio do corpo (ex.: "DECRETO DE 15 DE OUTUBRO").
PESSOAL_NO_TEXTO = re.compile(
    r"\b(?:nomear|exonerar|dispensar|designar|"
    r"conceder (?:a )?(?:f[ée]rias|licen[çc]a|gratifica\w*|promo[çc][ãa]o|folga)|"
    r"concess[ãa]o de (?:f[ée]rias|licen[çc]a|folga)|afasta\w*|gratifica[çc][ãa]o|di[áa]rias)\b|"
    r"\bLei n[ºo°.]*\s*(?:8\.112|14\.204)",
    _I,
)
_INICIO_TEXTO = 600

# Formas reais de compra/contratacao, cujo valor decide. "edital", "aviso" ou "extrato"
# soltos nao entram: ha edital de habilitacao, extrato de ata etc.
LICITACAO = re.compile(
    r"aviso de (?:licita|chamada|credenciamento|procedimento|procura|aluguel)|credenciamento|"
    r"preg[ãa]o|dispensa|inexigibilidade|tomada de pre[çc]os|"
    r"concorr[êe]ncia (?:p[úu]blica|eletr[ôo]nica)|chamamento p[úu]blico|chamada p[úu]blica|"
    r"resultado de julgamento|contrata[çc][ãa]o|"
    r"extrato (?:de |do )?(?:contrato|termo aditivo|registro de pre|dispensa|inexigib|conv[êe]nio|doa[çc])|"
    r"^extrato\s*(?:$|partes)|"
    r"homologa|ata de registro de pre|edital de (?:licita|preg|concorr|chamamento)",
    _I,
)

# Orgaos ligados ao agro (federais e de Rondonia). Nomes completos cobrem o DOU.
ORGAO_AGRO = re.compile(
    r"Agricultura e Pecu[áa]ria|Desenvolvimento Agr[áa]rio|\bIncra\b|Reforma Agr[áa]ria|"
    r"Pesca e Aquicultura|\bIbama\b|Recursos Naturais Renov[áa]veis|\bICMBio\b|Chico Mendes|"
    r"\bEmbrapa\b|Pesquisa Agropecu[áa]ria|\bConab\b|Companhia Nacional de Abastecimento|"
    r"\bIdaron\b|\bEmater\b|\bSeagri\b|\bSedam\b|\bSepat\b|"
    r"Patrim[ôo]nio e Regulariza[çc][ãa]o Fundi[áa]ria|Toxicologia",
    _I,
)
# Orgaos que o titulo ja entrega (ex.: "PORTARIA IBAMA Nº ...").
TITULO_AGRO = re.compile(r"\b(?:Ibama|Incra|Embrapa|Conab)\b", _I)

# Palavras de agro. "rural" e "cooperativa" sozinhas nao entram de proposito.
PALAVRAS_AGRO = re.compile(
    r"agropecu[áa]ri|agrot[óo]xic|defensivos? agr[íi]cola|cr[ée]dito rural|"
    r"assentamentos?(?! funciona)|sanidade (?:animal|vegetal)|rebanho|\bsafra|cultivar|"
    r"fitossanit|zoossanit|reforma agr[áa]ria|"
    r"agricultura familiar|pecu[áa]ria|agroneg[óo]cio|aquicultura|piscicultura|"
    r"\bpronaf\b|proagro|zoneamento agr[íi]cola|cadastro ambiental rural|sicarf|"
    r"titula[çc][ãa]o de (?:terra|im[óo]ve|lote|posse)|bovin|avicultur|fertilizante|"
    r"\bsementes?\b|c[ée]dula de produto rural|febre aftosa|brucelose|defesa (?:animal|vegetal)|"
    r"im[óo]ve(?:l|is) rura|lavoura|cafeicultur|\bsoja\b|extrativis",
    _I,
)

# O lookahead barra CNPJ ("R$ 27.271.958/0001-10") lido como dinheiro.
_VALOR = re.compile(
    r"R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?![\d/]|[.-]\d)"
    r"(?:\s+(mil(?:h[ãa]o|h[õo]es)?|bilh[ãa]o|bilh[õo]es))?",
    _I,
)
_ESCALA = {"mil": 10**3, "milhao": 10**6, "milhoes": 10**6, "bilhao": 10**9, "bilhoes": 10**9}


def _escala(palavra: str | None) -> int:
    if not palavra:
        return 1
    return _ESCALA[palavra.lower().replace("ã", "a").replace("õ", "o")]


def extrair_valor(texto: str) -> Decimal | None:
    """Maior valor em reais citado no texto (o total estimado), ou None.

    Formas nao tratadas: "R$ 500mil" (sem espaco), milhar com espaco,
    valor sem "R$" e OCR "RS".
    """
    valores = [
        Decimal(m.group(1).replace(".", "").replace(",", ".")) * _escala(m.group(2))
        for m in _VALOR.finditer(texto)
    ]
    return max(valores) if valores else None


def _eh_agro(ato: AtoBruto) -> bool:
    """Orgao agro, ou palavra de agro no titulo/texto (BCB so com crédito rural)."""
    if re.search(r"Banco Central", ato.orgao, _I):
        return bool(re.search(r"cr[ée]dito rural", f"{ato.titulo} {ato.texto}", _I))
    return bool(
        ORGAO_AGRO.search(ato.orgao)
        or TITULO_AGRO.search(ato.titulo)
        or PALAVRAS_AGRO.search(f"{ato.titulo} {ato.texto}")
    )


def _eh_pessoal(ato: AtoBruto) -> bool:
    return bool(
        PESSOAL.search(ato.titulo)
        or PESSOAL_ORGAO.search(ato.orgao)
        or PESSOAL_NO_TEXTO.search(ato.texto[:_INICIO_TEXTO])
    )


def triar(ato: AtoBruto) -> bool:
    """True se o ato deve seguir para a IA."""
    if _eh_pessoal(ato):
        return False
    if LICITACAO.search(ato.titulo):
        valor = extrair_valor(ato.texto)
        if valor is None or valor < settings.BOLETIM_VALOR_MINIMO:
            return False
    return _eh_agro(ato)


def precisa_texto_completo(ato: AtoBruto) -> bool:
    """True se o ato do DOU e licitacao agro cujo valor sumiu no texto truncado."""
    return (
        ato.fonte == "dou"
        and ato.texto.rstrip().endswith(("...", "…"))
        and bool(LICITACAO.search(ato.titulo))
        and not _eh_pessoal(ato)
        and extrair_valor(ato.texto) is None
        and _eh_agro(ato)
    )
