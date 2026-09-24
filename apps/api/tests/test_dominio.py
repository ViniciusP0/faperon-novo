from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from indicadores import dominio
from indicadores.models import Agregacao

D = Decimal
valores = st.decimals(min_value=D("0"), max_value=D("1000000"), places=2, allow_nan=False)
positivos = st.decimals(min_value=D("0.01"), max_value=D("100000"), places=2, allow_nan=False)


def test_total_soma_ignora_ausentes() -> None:
    assert dominio.total_soma([D(10), None, D(5)]) == D(15)


def test_total_soma_sem_valores_e_none_nao_zero() -> None:
    assert dominio.total_soma([None, None]) is None
    assert dominio.total_soma([]) is None


def test_media_ponderada_exemplo() -> None:
    # 2000 kg/ha em 50 ha e 4000 kg/ha em 150 ha => 3500
    assert dominio.media_ponderada([(D(2000), D(50)), (D(4000), D(150))]) == D(3500)


def test_media_ponderada_sem_peso_positivo() -> None:
    assert dominio.media_ponderada([(D(10), D(0))]) is None
    assert dominio.media_ponderada([]) is None


def test_rendimento_nao_e_somado() -> None:
    total = dominio.total_por_regra(
        Agregacao.MEDIA_PONDERADA, [D(2000), D(4000)], [(D(2000), D(1))]
    )
    assert total == D(2000)


def test_total_nao_agregavel_e_none() -> None:
    assert dominio.total_por_regra(Agregacao.NAO_AGREGAVEL, [D(1)]) is None


def test_percentual_com_total_invalido() -> None:
    assert dominio.percentual(D(1), None) is None
    assert dominio.percentual(D(1), D(0)) is None
    assert dominio.percentual(None, D(10)) is None
    assert dominio.percentual(D(25), D(100)) == D(25)


MUNICIPIOS = [("1", "A"), ("2", "B"), ("3", "C"), ("4", "D")]


def test_ranking_ordena_ok_depois_sigiloso_depois_inexistente() -> None:
    medicoes = {
        "1": (D(10), "ok"),
        "2": (None, "sigiloso"),
        "3": (D(30), "ok"),
    }
    itens = dominio.montar_ranking(MUNICIPIOS, medicoes, D(40), Agregacao.SOMA)
    assert [i.codigo_ibge for i in itens] == ["3", "1", "2", "4"]
    assert [i.posicao for i in itens] == [1, 2, None, None]
    assert [i.status for i in itens] == ["ok", "ok", "sigiloso", "inexistente"]
    assert itens[0].percentual_total == D(75)
    assert itens[2].valor is None and itens[3].valor is None


def test_ranking_desempate_por_codigo() -> None:
    medicoes = {"2": (D(5), "ok"), "1": (D(5), "ok")}
    itens = dominio.montar_ranking(MUNICIPIOS, medicoes, D(10), Agregacao.SOMA)
    assert [i.codigo_ibge for i in itens[:2]] == ["1", "2"]


def test_ranking_sem_percentual_para_media_ponderada() -> None:
    itens = dominio.montar_ranking(
        MUNICIPIOS, {"1": (D(3000), "ok")}, D(3000), Agregacao.MEDIA_PONDERADA
    )
    assert itens[0].percentual_total is None


def test_ranking_ok_sem_valor_vira_inexistente() -> None:
    itens = dominio.montar_ranking(MUNICIPIOS, {"1": (None, "ok")}, None, Agregacao.SOMA)
    assert all(i.status == "inexistente" for i in itens)


@given(st.lists(valores, min_size=1, max_size=30))
def test_soma_independe_da_ordem(lista: list[Decimal]) -> None:
    assert dominio.total_soma(lista) == dominio.total_soma(list(reversed(lista)))


@given(st.lists(st.tuples(valores, positivos), min_size=1, max_size=30))
def test_media_ponderada_fica_entre_minimo_e_maximo(pares: list[tuple[Decimal, Decimal]]) -> None:
    media = dominio.media_ponderada(pares)
    assert media is not None
    valores_ = [v for v, _ in pares]
    tolerancia = D("0.0001")
    assert min(valores_) - tolerancia <= media <= max(valores_) + tolerancia


@given(st.lists(valores, min_size=1, max_size=52, unique=True))
def test_ranking_e_permutacao_decrescente_e_percentuais_somam_100(lista: list[Decimal]) -> None:
    municipios = [(str(i).zfill(7), f"M{i}") for i in range(len(lista))]
    medicoes = {codigo: (v, "ok") for (codigo, _), v in zip(municipios, lista, strict=True)}
    total = dominio.total_soma(lista)
    itens = dominio.montar_ranking(municipios, medicoes, total, Agregacao.SOMA)
    assert len(itens) == len(lista)
    assert [i.valor for i in itens] == sorted(lista, reverse=True)
    assert [i.posicao for i in itens] == list(range(1, len(lista) + 1))
    if total and total > 0:
        soma_pct = sum((i.percentual_total or D(0)) for i in itens)
        assert abs(soma_pct - D(100)) < D("0.0001")
