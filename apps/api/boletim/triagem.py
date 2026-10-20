"""Triagem barata dos atos, antes de gastar chamada de IA.

Funcoes puras (sem rede nem banco). Na duvida, deixa o ato passar para a IA;
o objetivo e so cortar o ruido evidente (pessoal e licitacao pequena).
"""

import re
from decimal import Decimal

from django.conf import settings

from boletim.tipos import AtoBruto

_I = re.IGNORECASE

# Ato de pessoal ou de funcionamento interno (titulo ou orgao): nunca interessa.
PESSOAL = re.compile(
    r"\bpessoal\b|nomea|exonera|designa|f[ée]rias|di[áa]rias|\bfolga|ced[êe]ncia|"
    r"promo[çc][ãa]o|aposentador|remarca[çc][ãa]o|\bpens[ãa]o|\bservidor",
    _I,
)

# Verbos de pessoal que so aparecem no inicio do corpo (ex.: "DECRETO DE 15 DE OUTUBRO").
PESSOAL_NO_TEXTO = re.compile(
    r"\b(?:nomear|exonerar|dispensar|designar|conceder (?:f[ée]rias|licen[çc]a|gratifica)|"
    r"afasta\w*|gratifica[çc][ãa]o|di[áa]rias)\b",
    _I,
)
_INICIO_TEXTO = 600

# Atos cujo valor decide (licitacoes, contratos, avisos, resultados).
LICITACAO = re.compile(
    r"\baviso\b|preg[ãa]o|dispensa|edital|licita[çc]|julgamento|\bextrato|homologa|"
    r"chamamento|concorr[êe]ncia|tomada de pre|\bcontrato|termo aditivo|aluguel",
    _I,
)

# Orgaos ligados ao agro (federais e de Rondonia).
ORGAO_AGRO = re.compile(
    r"Agricultura e Pecu[áa]ria|Desenvolvimento Agr[áa]rio|\bIncra\b|Reforma Agr[áa]ria|"
    r"Pesca e Aquicultura|\bIbama\b|\bICMBio\b|Chico Mendes|\bEmbrapa\b|\bConab\b|"
    r"Companhia Nacional de Abastecimento|\bIdaron\b|\bEmater\b|\bSeagri\b|\bSedam\b|"
    r"\bSepat\b|Patrim[ôo]nio e Regulariza[çc][ãa]o Fundi[áa]ria",
    _I,
)

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

_VALOR = re.compile(
    r"R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)"
    r"(?:\s+(mil(?:h[ãa]o|h[õo]es)?|bilh[ãa]o|bilh[õo]es))?",
    _I,
)
_ESCALA = {"mil": 10**3, "milhao": 10**6, "milhoes": 10**6, "bilhao": 10**9, "bilhoes": 10**9}


def _escala(palavra: str | None) -> int:
    if not palavra:
        return 1
    return _ESCALA[palavra.lower().replace("ã", "a").replace("õ", "o")]


def extrair_valor(texto: str) -> Decimal | None:
    """Maior valor em reais citado no texto (o total estimado), ou None."""
    valores = [
        Decimal(m.group(1).replace(".", "").replace(",", ".")) * _escala(m.group(2))
        for m in _VALOR.finditer(texto)
    ]
    return max(valores) if valores else None


def _eh_agro(ato: AtoBruto) -> bool:
    """Orgao agro, ou palavra de agro no titulo/texto (BCB so com crédito rural)."""
    if re.search(r"Banco Central", ato.orgao, _I):
        return bool(re.search(r"cr[ée]dito rural", f"{ato.titulo} {ato.texto}", _I))
    return bool(ORGAO_AGRO.search(ato.orgao) or PALAVRAS_AGRO.search(f"{ato.titulo} {ato.texto}"))


def triar(ato: AtoBruto) -> bool:
    """True se o ato deve seguir para a IA."""
    if PESSOAL.search(ato.titulo) or PESSOAL.search(ato.orgao):
        return False
    if PESSOAL_NO_TEXTO.search(ato.texto[:_INICIO_TEXTO]):
        return False
    if LICITACAO.search(ato.titulo):
        valor = extrair_valor(ato.texto)
        if valor is None or valor < settings.BOLETIM_VALOR_MINIMO:
            return False
    return _eh_agro(ato)
