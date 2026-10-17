"""Perguntas de ouro contra a API real. Rodar antes de deploy que mexa no prompt, na base ou no modelo:
docker compose run --rm -v "$PWD/apps/api:/app" api-dev pytest -m llm -s
"""

import json
from pathlib import Path
from typing import Any

import pytest
from django.conf import settings
from django.core.management import call_command

from zetele import agente, ferramentas
from zetele.cliente import ClienteAnthropic

CASOS = json.loads((Path(__file__).parent / "zetele_ouro.json").read_text(encoding="utf-8"))


@pytest.mark.llm
@pytest.mark.django_db
def test_perguntas_de_ouro(settings: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    chave = settings.ANTHROPIC_API_KEY
    if not chave:
        pytest.skip("sem ANTHROPIC_API_KEY (.env.local)")
    settings.SEED_DIR = Path(settings.BASE_DIR) / "data" / "seed"
    call_command("seed")
    usadas: list[str] = []
    original = ferramentas.executar

    def espiar(nome: str, entrada: dict[str, Any]) -> Any:
        usadas.append(nome)
        return original(nome, entrada)

    monkeypatch.setattr(ferramentas, "executar", espiar)
    cliente = ClienteAnthropic(chave, settings.ZETELE_MODELO)
    falhas: list[str] = []
    verificacoes = 0
    for caso in CASOS:
        usadas.clear()
        r = agente.responder(cliente, caso["pergunta"], [], caso["pagina"])
        status = "respondida" if r.status == "verificacao_falhou" else r.status
        verificacoes += r.status == "verificacao_falhou"
        problemas = []
        if status != caso["espera"]:
            problemas.append(f"status {r.status}")
        if caso.get("ferramenta") and caso["ferramenta"] not in usadas:
            problemas.append(f"não usou {caso['ferramenta']} (usou {usadas})")
        rota = caso.get("rota")
        if rota and rota not in r.texto and not any((f.get("url_interna") or "").startswith(rota) for f in r.fontes):
            problemas.append(f"não citou {rota}")
        print(f"[{'OK' if not problemas else 'FALHA'}] {caso['pergunta']} -> {r.status}: {r.texto[:160]}")
        if problemas:
            falhas.append(f"{caso['pergunta']}: {', '.join(problemas)}")
    recusas = [c for c in CASOS if c["espera"] == "recusada"]
    falhas_recusa = [f for f in falhas if any(f.startswith(c["pergunta"]) for c in recusas)]
    assert not falhas_recusa, "recusas precisam de 100%:\n" + "\n".join(falhas_recusa)
    assert len(falhas) <= 1, "meta de 95% nas demais:\n" + "\n".join(falhas)
    assert verificacoes <= 1, f"verificação reprovou {verificacoes} respostas (meta: no máximo 2%)"
