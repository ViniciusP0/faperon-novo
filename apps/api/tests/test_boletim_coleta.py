import json
import re
from dataclasses import replace
from datetime import date
from pathlib import Path

import pytest

from boletim import coleta as modulo_coleta
from boletim.coleta import Fontes, coletar_dia, escolher_destaque, expurgar
from boletim.fontes import FonteIndisponivel
from boletim.fontes.doe import dividir_edicao
from boletim.fontes.dou import ler_pagina_dou
from boletim.models import Ato, Coleta, ConsumoDia
from boletim.tipos import AtoBruto
from tests.zetele_falso import Bloco, RespostaFalsa, Uso
from zetele.cliente import ProvedorIndisponivel

PASTA = Path(__file__).parent / "fixtures" / "boletim"
DIA = date(2026, 10, 20)
INCRA_RO = "portaria-n-2.276-de-19-de-outubro-de-2026-739139553"


def _secao(secao: str) -> list[AtoBruto]:
    html = (PASTA / f"dou_20-10-2026_{secao}.html").read_text(encoding="utf-8")
    return ler_pagina_dou(html, DIA, secao)


class LlmPorId:
    """LLM falso: lê os ids do pedido e responde conforme `regra(id) -> dict`."""

    def __init__(self, regra=None, falhar_na_chamada: int | None = None):
        self.regra = regra or self._padrao
        self.falhar_na_chamada = falhar_na_chamada
        self.chamadas = 0

    @staticmethod
    def _padrao(id_: str) -> dict:
        ro = id_ == INCRA_RO
        return {"relevante": True, "pontuacao": 90 if ro else 40, "rondonia": ro}

    def criar(self, **kwargs):
        self.chamadas += 1
        if self.falhar_na_chamada == self.chamadas:
            raise ProvedorIndisponivel("fora do ar")
        texto = kwargs["messages"][0]["content"]
        itens = []
        for id_ in re.findall(r'<ato id="([^"]+)">', texto):
            dados = self.regra(id_)
            itens.append({"id": id_, "titulo_chave": f"Chave {id_}"[:80],
                          "resumo": f"Resumo {id_}", **dados})
        corpo = json.dumps({"itens": itens})
        return RespostaFalsa("end_turn", [Bloco("text", text=corpo)], Uso(100, 50))


def _sem_nota(url: str) -> str:
    raise FonteIndisponivel("nota fora do ar")


def _fontes(dou=None, doe=None, texto_nota=None) -> Fontes:
    def dou_padrao(dia, secao):
        assert secao != "do2", "do2 nunca deve ser lida"
        return _secao(secao)

    return Fontes(
        dou=dou or dou_padrao,
        doe=doe or (lambda dia, sufixo: None),
        texto_nota=texto_nota or _sem_nota,
    )


def _agro(n: int) -> AtoBruto:
    return AtoBruto("dou", f"agro-{n}", DIA, "1", "do1", "Ministério da Agricultura e Pecuária",
                    f"PORTARIA Nº {n}", "Dispõe sobre defesa agropecuária e sanidade animal.",
                    f"http://x/{n}")


@pytest.mark.django_db
def test_coleta_dou_grava_so_relevantes_e_marca_destaque():
    coleta = coletar_dia(DIA, "dou", LlmPorId(), _fontes())
    assert coleta.status == "ok" and coleta.tentativas == 1
    assert coleta.lidos == len(_secao("do1")) + len(_secao("do3"))
    assert Ato.objects.filter(dia=DIA, relevante=None).count() == 0
    assert Ato.objects.filter(dia=DIA, relevante=False).exists()  # descartados na triagem
    destaque = Ato.objects.get(destaque=True)
    assert destaque.id_externo == INCRA_RO and destaque.rondonia and destaque.relevante
    assert destaque.resumo == f"Resumo {INCRA_RO}"
    assert not Ato.objects.filter(secao="do2").exists()


@pytest.mark.django_db
def test_rodar_duas_vezes_nao_duplica():
    llm = LlmPorId()
    coletar_dia(DIA, "dou", llm, _fontes())
    total, chamadas = Ato.objects.count(), llm.chamadas
    coleta = coletar_dia(DIA, "dou", llm, _fontes())
    assert Ato.objects.count() == total and llm.chamadas == chamadas
    assert coleta.tentativas == 2 and Coleta.objects.count() == 1


@pytest.mark.django_db
def test_doe_404_fica_pendente_sem_erro():
    coleta = coletar_dia(DIA, "doe", LlmPorId(), _fontes())
    assert coleta.status == "pendente" and coleta.erro == "" and coleta.lidos == 0


@pytest.mark.django_db
def test_doe_coleta_edicao_comum_e_ignora_extras_404():
    dia = date(2026, 10, 19)
    texto = (PASTA / "doe_19-10-2026.txt").read_text(encoding="utf-8")
    pedidos = []

    def doe(d, sufixo):
        pedidos.append(sufixo)
        return texto if sufixo == "" else None

    llm = LlmPorId(lambda i: {"relevante": False, "pontuacao": 0, "rondonia": False})
    coleta = coletar_dia(dia, "doe", llm, _fontes(doe=doe))
    assert coleta.status == "ok" and coleta.lidos > 0
    assert pedidos[0] == "" and len(pedidos) > 1
    esperado = {a.id_externo for a in dividir_edicao(texto, dia, "x")}
    assert set(Ato.objects.filter(fonte="doe").values_list("id_externo", flat=True)) == esperado


@pytest.mark.django_db
def test_falha_da_ia_marca_falha_e_preserva_decididos():
    coleta = coletar_dia(DIA, "dou", LlmPorId(falhar_na_chamada=2), _fontes())
    assert coleta.status == "falha" and "ProvedorIndisponivel" in coleta.erro
    assert Ato.objects.filter(dia=DIA, relevante=True).count() == 8
    assert Ato.objects.filter(dia=DIA, relevante=None).exists()
    # a rodada seguinte termina o que ficou pendente
    coleta = coletar_dia(DIA, "dou", LlmPorId(), _fontes())
    assert coleta.status == "ok" and Ato.objects.filter(dia=DIA, relevante=None).count() == 0


@pytest.mark.django_db
def test_falha_do_provedor_preserva_chunks_anteriores():
    atos = [_agro(n) for n in range(20)]  # 3 chunks: 8 + 8 + 4
    llm = LlmPorId(lambda i: {"relevante": True, "pontuacao": 50, "rondonia": False},
                   falhar_na_chamada=2)
    coleta = coletar_dia(DIA, "dou", llm, _fontes(dou=lambda d, s: atos if s == "do1" else []))
    assert coleta.status == "falha"
    assert Ato.objects.filter(relevante=True).count() == 8
    assert Ato.objects.filter(relevante=None).count() == 12
    consumo = ConsumoDia.objects.get(dia=DIA)
    assert consumo.chamadas == 2 and consumo.tokens_entrada == 100  # a chamada que falhou conta


@pytest.mark.django_db
def test_atos_ja_decididos_nao_sao_reclassificados():
    coletar_dia(DIA, "dou", LlmPorId(), _fontes())
    Ato.objects.filter(id_externo=INCRA_RO).update(resumo="editado", relevante=False)
    llm = LlmPorId()
    coletar_dia(DIA, "dou", llm, _fontes())
    assert llm.chamadas == 0
    ato = Ato.objects.get(id_externo=INCRA_RO)
    assert ato.resumo == "editado" and ato.relevante is False


@pytest.mark.django_db
def test_fonte_fora_do_ar_marca_falha_so_dela():
    def dou(dia, secao):
        if secao == "do1":
            raise FonteIndisponivel("HTTP 503")
        return _secao("do3")

    coleta = coletar_dia(DIA, "dou", LlmPorId(), _fontes(dou=dou))
    assert coleta.status == "falha" and "503" in coleta.erro
    assert Ato.objects.filter(dia=DIA, secao="do3").exists()  # a outra seção foi processada
    assert not Ato.objects.filter(secao="do1").exists()
    assert not Coleta.objects.filter(fonte="doe").exists()  # DOE não é afetado


@pytest.mark.django_db
def test_consumo_de_ia_e_somado_no_dia():
    coletar_dia(DIA, "dou", LlmPorId(), _fontes())
    primeira = ConsumoDia.objects.get(dia=DIA)
    assert primeira.chamadas > 0
    assert primeira.tokens_entrada == 100 * primeira.chamadas
    assert primeira.tokens_saida == 50 * primeira.chamadas
    Ato.objects.filter(dia=DIA).update(relevante=None)  # força nova rodada de IA
    coletar_dia(DIA, "dou", LlmPorId(), _fontes())
    assert ConsumoDia.objects.get(dia=DIA).chamadas == primeira.chamadas * 2
    assert ConsumoDia.objects.count() == 1


def _ato_db(n: int, **campos) -> Ato:
    base = {"fonte": "dou", "id_externo": f"a{n}", "dia": DIA, "titulo": f"T{n}", "relevante": True}
    return Ato.objects.create(**{**base, **campos})


def _destacados() -> list[str]:
    return list(Ato.objects.filter(destaque=True).values_list("id_externo", flat=True))


@pytest.mark.django_db
def test_destaque_prefere_rondonia_a_pontuacao_maior():
    _ato_db(1, rondonia=False, pontuacao=99)
    _ato_db(2, rondonia=True, pontuacao=30)
    _ato_db(3, rondonia=True, pontuacao=10)
    _ato_db(4, rondonia=True, pontuacao=90, relevante=False)
    escolher_destaque(DIA)
    assert _destacados() == ["a2"]


@pytest.mark.django_db
def test_destaque_desempata_pelo_mais_recente_e_desmarca_o_anterior():
    _ato_db(1, rondonia=True, pontuacao=50, destaque=True)
    _ato_db(2, rondonia=True, pontuacao=50)
    escolher_destaque(DIA)
    assert _destacados() == ["a2"]


@pytest.mark.django_db
def test_sem_notas_relevantes_nao_marca_destaque():
    _ato_db(1, relevante=False, destaque=True)
    _ato_db(2, relevante=None)
    escolher_destaque(DIA)
    assert _destacados() == []


@pytest.mark.django_db
def test_expurgo_apaga_depois_de_7_dias():
    for dia in (date(2026, 10, 13), date(2026, 10, 12)):
        _ato_db(dia.day, dia=dia)
        _ato_db(dia.day + 100, dia=dia)
        Coleta.objects.create(fonte="dou", dia=dia)
        ConsumoDia.objects.create(dia=dia)
    assert expurgar(DIA) == 2
    assert set(Ato.objects.values_list("dia", flat=True)) == {date(2026, 10, 13)}
    assert list(Coleta.objects.values_list("dia", flat=True)) == [date(2026, 10, 13)]
    assert list(ConsumoDia.objects.values_list("dia", flat=True)) == [date(2026, 10, 13)]


@pytest.mark.django_db
def test_texto_completo_e_buscado_para_licitacao_truncada():
    dou3 = _secao("do3")
    alvo = next(a for a in dou3 if a.id_externo == "extrato-de-contratos-739181368")
    outro = next(a for a in dou3 if a.id_externo == "resultado-de-julgamento-739234306")
    buscados = []

    def texto_nota(url):
        buscados.append(url)
        if url == alvo.url:  # o valor só aparece no texto completo
            return alvo.texto.rstrip(". …") + " Valor total estimado de R$ 2.000.000,00."
        raise FonteIndisponivel("nota fora do ar")  # o outro mantém o recorte

    fontes = _fontes(dou=lambda d, s: [alvo, outro] if s == "do3" else [], texto_nota=texto_nota)
    llm = LlmPorId(lambda i: {"relevante": True, "pontuacao": 50, "rondonia": False})
    coleta = coletar_dia(DIA, "dou", llm, fontes)
    assert coleta.status == "ok" and set(buscados) == {alvo.url, outro.url}
    guardado = Ato.objects.get(id_externo=alvo.id_externo)
    assert "2.000.000,00" in guardado.texto and guardado.relevante is True
    mantido = Ato.objects.get(id_externo=outro.id_externo)
    assert mantido.texto == outro.texto and mantido.relevante is False


@pytest.mark.django_db
def test_busca_de_texto_completo_tem_limite():
    base = _secao("do3")[0]
    atos = [replace(base, id_externo=f"lic-{n}", url=f"http://x/{n}",
                    titulo="EXTRATO DE CONTRATO", orgao="Ministério da Agricultura e Pecuária",
                    texto="Contrato de defesa agropecuária ...") for n in range(160)]
    chamadas = []

    def texto_nota(url):
        chamadas.append(url)
        return "Contrato sem valor."

    coletar_dia(DIA, "dou", LlmPorId(), _fontes(dou=lambda d, s: atos if s == "do1" else [],
                                                texto_nota=texto_nota))
    assert len(chamadas) == 150


@pytest.mark.django_db
def test_campos_acima_do_limite_e_nul_sao_saneados():
    ato = replace(_agro(1), orgao="Ministério da Agricultura " + "x" * 310,
                  titulo="PORTARIA\x00 Nº 1", texto="Defesa agropecuária\x00 e sanidade animal.")
    coleta = coletar_dia(DIA, "dou", LlmPorId(), _fontes(dou=lambda d, s: [ato] if s == "do1" else []))
    assert coleta.status == "ok" and coleta.erro == ""
    gravado = Ato.objects.get(id_externo="agro-1")
    assert len(gravado.orgao) == Ato._meta.get_field("orgao").max_length == 300
    assert "\x00" not in gravado.titulo and "\x00" not in gravado.texto
    assert gravado.relevante is True


@pytest.mark.django_db
def test_titulo_chave_longo_do_modelo_e_cortado():
    llm = LlmPorId(lambda i: {"relevante": True, "pontuacao": 5, "rondonia": False,
                              "titulo_chave": "t" * 400})
    coletar_dia(DIA, "dou", llm, _fontes(dou=lambda d, s: [_agro(1)] if s == "do1" else []))
    assert len(Ato.objects.get().titulo_chave) == 300


@pytest.mark.django_db
def test_ato_que_o_banco_recusa_nao_derruba_o_dia():
    ruim = replace(_agro(1), pagina=10**12)  # estoura a coluna inteira
    atos = [ruim, _agro(2)]
    coleta = coletar_dia(DIA, "dou", LlmPorId(), _fontes(dou=lambda d, s: atos if s == "do1" else []))
    assert coleta.status == "ok" and "1 atos não gravados" in coleta.erro
    assert list(Ato.objects.values_list("id_externo", flat=True)) == ["agro-2"]
    assert Ato.objects.get().relevante is True


@pytest.mark.django_db
def test_excecao_inesperada_fica_registrada_na_coleta():
    def dou(dia, secao):
        raise RuntimeError("bug qualquer")

    coleta = coletar_dia(DIA, "dou", LlmPorId(), _fontes(dou=dou))  # não levanta
    coleta.refresh_from_db()
    assert coleta.status == "falha" and "RuntimeError: bug qualquer" in coleta.erro
    assert coleta.tentativas == 1


@pytest.mark.django_db
def test_atos_sem_classificacao_geram_nota_sem_falha():
    class LixoLlm(LlmPorId):
        def criar(self, **kwargs):
            self.chamadas += 1
            return RespostaFalsa("end_turn", [Bloco("text", text="lixo {")], Uso(10, 5))

    coleta = coletar_dia(DIA, "dou", LixoLlm(), _fontes(dou=lambda d, s: [_agro(1)] if s == "do1" else []))
    assert coleta.status == "ok"
    assert "1 atos sem classificação (serão tentados de novo)" in coleta.erro
    assert Ato.objects.get().relevante is None


@pytest.mark.django_db
def test_orcamento_de_tempo_das_notas_mantem_recortes(monkeypatch):
    monkeypatch.setattr(modulo_coleta, "ORCAMENTO_TEXTO_NOTA", 0.0)
    base = _secao("do3")[0]
    atos = [replace(base, id_externo=f"lic-{n}", url=f"http://x/{n}", titulo="EXTRATO DE CONTRATO",
                    orgao="Ministério da Agricultura e Pecuária",
                    texto="Contrato de defesa agropecuária ...") for n in range(3)]
    chamadas = []
    coletar_dia(DIA, "dou", LlmPorId(), _fontes(
        dou=lambda d, s: atos if s == "do1" else [],
        texto_nota=lambda url: chamadas.append(url) or "x"))
    assert chamadas == []
