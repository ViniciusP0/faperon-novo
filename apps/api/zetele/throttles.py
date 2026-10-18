from typing import Any

from rest_framework.throttling import SimpleRateThrottle


class ZeteleGlobalThrottle(SimpleRateThrottle):
    """Teto de perguntas por minuto somando todos os visitantes (mesmo padrão do PDF, ADR 0023)."""

    scope = "zetele_global"

    def get_cache_key(self, request: Any, view: Any) -> str:
        return self.cache_format % {"scope": self.scope, "ident": "todos"}


class ZeteleSistemaGlobalThrottle(ZeteleGlobalThrottle):
    """Teto por minuto do Zétele do sistema, separado do público."""

    scope = "zetele_sistema_global"
