class NaoEncontrado(Exception):
    """Produto, indicador ou município inexistente (HTTP 404)."""


class ConsultaInvalida(Exception):
    """Parâmetros com combinação inválida (HTTP 400)."""

    def __init__(self, mensagem: str, campos: dict[str, str] | None = None) -> None:
        super().__init__(mensagem)
        self.campos = campos or {}


class RecorteIncompativel(Exception):
    """Comparação impossível, ex.: unidades diferentes (HTTP 422)."""
