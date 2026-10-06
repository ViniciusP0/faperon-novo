from typing import Any

from rest_framework.throttling import SimpleRateThrottle


class PdfGlobalThrottle(SimpleRateThrottle):
    """Teto de PDFs por minuto somando todos os clientes: limita o estrago se o IP for forjado."""

    scope = "pdf_global"

    def get_cache_key(self, request: Any, view: Any) -> str:
        return self.cache_format % {"scope": self.scope, "ident": "todos"}
