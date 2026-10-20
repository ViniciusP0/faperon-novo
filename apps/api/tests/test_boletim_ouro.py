"""Calibração do boletim contra a API real (19 e 20/10/2026). Rodar antes de deploy que mexa no
prompt, na triagem ou no modelo:
docker compose run --rm --entrypoint "" -v "$PWD/apps/api:/app" -v "$PWD/data:/app/data" \
    api-dev pytest -m llm tests/test_boletim_ouro.py -s
"""

import re
from datetime import date
from pathlib import Path
from typing import Any

import pytest

from boletim.classificador import classificar
from boletim.fontes.doe import dividir_edicao
from boletim.fontes.dou import ler_pagina_dou
from boletim.tipos import AtoBruto
from boletim.triagem import triar
from zetele.cliente import ClienteAnthropic

FIXTURES = Path(__file__).parent / "fixtures" / "boletim"
MAX_RESUMO = 900


def _carregar() -> list[AtoBruto]:
    atos: list[AtoBruto] = []
    for dia in (19, 20):
        for n in (1, 2, 3):
            html = (FIXTURES / f"dou_{dia}-10-2026_do{n}.html").read_text(encoding="utf-8")
            atos += ler_pagina_dou(html, date(2026, 10, dia), f"do{n}")
    texto = (FIXTURES / "doe_19-10-2026.txt").read_text(encoding="utf-8")
    atos += dividir_edicao(texto, date(2026, 10, 19), "https://exemplo.invalid/doe")
    return atos


def _achar(atos: list[AtoBruto], fonte: str, titulo: str, orgao: str = "") -> AtoBruto:
    """Acha o ato pelo começo do título (ignora caixa) e, se dado, por trecho do órgão."""
    padrao = re.compile(re.escape(titulo), re.IGNORECASE)
    for a in atos:
        if a.fonte == fonte and padrao.match(a.titulo) and orgao.lower() in a.orgao.lower():
            return a
    raise AssertionError(f"ato não encontrado nas fixtures: {titulo} ({orgao})")


@pytest.mark.llm
def test_ouro_19_e_20_de_outubro(settings: Any) -> None:
    chave = settings.ANTHROPIC_API_KEY
    if not chave:
        pytest.skip("sem ANTHROPIC_API_KEY (.env.local): calibração do boletim não executada")
    atos = _carregar()
    incra_2276 = _achar(atos, "dou", "PORTARIA Nº 2.276", "colonização")
    incra_2273 = _achar(atos, "dou", "PORTARIA Nº 2.273", "colonização")
    obrigatorios = {
        "Incra Portaria 2.276": incra_2276,
        "Incra Portaria 2.273": incra_2273,
        "BCB IN 782": _achar(atos, "dou", "INSTRUÇÃO NORMATIVA BCB Nº 782"),
        "Mapa Comunicado 1": _achar(atos, "dou", "COMUNICADO Nº 1,"),
        "Anvisa Resolução-RE 4.112": _achar(atos, "dou", "Resolução-RE nº 4.112"),
        "Sepat Portaria 270": _achar(atos, "doe", "Portaria nº 270 "),
    }
    # o que a triagem barra nunca chega à IA; os obrigatórios precisam chegar
    for nome, ato in obrigatorios.items():
        assert triar(ato), f"a triagem barrou {nome}"
    candidatos = [a for a in atos if triar(a)]

    cliente = ClienteAnthropic(chave, settings.BOLETIM_MODELO)
    vereditos, uso = classificar(candidatos, cliente)
    por_id = {v.id_externo: v for v in vereditos}
    por_ato = {a.id_externo: a for a in candidatos}

    print(f"\nModelo: {settings.BOLETIM_MODELO}")
    print(f"Atos enviados: {len(candidatos)} de {len(atos)} lidos")
    print(f"Uso: {uso}")
    for v in sorted(vereditos, key=lambda x: (x.relevante, x.rondonia, x.pontuacao), reverse=True):
        ato = por_ato[v.id_externo]
        marca = "RELEVANTE" if v.relevante else "irrelevante"
        print(f"\n[{marca}] {ato.orgao} | {ato.titulo} (nota {v.pontuacao}, RO={v.rondonia})")
        if v.relevante:
            print(f"  {v.titulo_chave}\n  {v.resumo}")

    falhas = [
        nome
        for nome, ato in obrigatorios.items()
        if ato.id_externo not in por_id or not por_id[ato.id_externo].relevante
    ]
    assert not falhas, f"deveriam sair relevantes e não saíram: {falhas}"

    # a triagem tem de barrar as portarias de pessoal antes da IA (regressão dela passaria batido)
    pessoais = [a for a in atos if "PESSOAL" in a.titulo.upper()]
    assert pessoais, "as fixtures deveriam ter portarias de pessoal"
    liberadas = [a.titulo for a in pessoais if triar(a)]
    assert not liberadas, f"a triagem deixou passar portaria de pessoal: {liberadas}"
    relevantes_pessoal = [
        a.titulo for a in pessoais if a.id_externo in por_id and por_id[a.id_externo].relevante
    ]
    assert not relevantes_pessoal, f"portaria de pessoal saiu relevante: {relevantes_pessoal}"

    for v in vereditos:
        if v.relevante:
            assert 0 < len(v.resumo) <= MAX_RESUMO, f"resumo fora do tamanho: {v.id_externo}"

    # o destaque é por dia (coleta.escolher_destaque); as do Incra são do DOU de 20/10
    relevantes = [
        v for v in vereditos if v.relevante and por_ato[v.id_externo].dia == date(2026, 10, 20)
    ]
    melhor = max((v.rondonia, v.pontuacao) for v in relevantes)
    ids_incra = {incra_2276.id_externo, incra_2273.id_externo}
    donos = {v.id_externo for v in relevantes if (v.rondonia, v.pontuacao) == melhor}
    assert donos & ids_incra, f"o destaque deveria ser uma portaria do Incra em RO, foi {donos}"
