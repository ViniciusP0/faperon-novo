"""POST aos fornecedores de voz, com os erros no padrão do zetele/cliente.py.

Nunca põe no log nem na mensagem da exceção o corpo do pedido (áudio) ou da resposta, nem a chave.
"""

from typing import Any

import requests

from zetele.cliente import PedidoRecusado, ProvedorIndisponivel


def postar(url: str, *, fornecedor: str, timeout: float, **kwargs: Any) -> requests.Response:
    try:
        resposta = requests.post(url, timeout=timeout, **kwargs)
    except requests.Timeout as exc:
        raise ProvedorIndisponivel(f"{fornecedor}: tempo esgotado") from exc
    except requests.RequestException as exc:
        raise ProvedorIndisponivel(f"{fornecedor}: falha de conexão") from exc
    # 429 e 5xx são do fornecedor (abrem o disjuntor da voz); outro 4xx é deste pedido
    if resposta.status_code == 429 or resposta.status_code >= 500:
        raise ProvedorIndisponivel(f"{fornecedor}: HTTP {resposta.status_code}")
    if resposta.status_code >= 400:
        raise PedidoRecusado(f"{fornecedor}: HTTP {resposta.status_code}")
    return resposta


def corpo_json(resposta: requests.Response, fornecedor: str) -> dict[str, Any]:
    try:
        corpo = resposta.json()
    except ValueError as exc:
        raise PedidoRecusado(f"{fornecedor}: resposta fora do formato") from exc
    if not isinstance(corpo, dict):
        raise PedidoRecusado(f"{fornecedor}: resposta fora do formato")
    return corpo
