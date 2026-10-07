from decimal import Decimal as D

import pytest

from observatorio import calculos as c


def test_deflacionar_leva_ao_ano_de_referencia() -> None:
    indices = {2014: D(4000), 2024: D(6000)}
    assert c.deflacionar(D(100), 2014, 2024, indices) == D(150)
    assert c.deflacionar(D(100), 2024, 2024, indices) == D(100)


@pytest.mark.parametrize("ano", [1994, 2030])
def test_deflacionar_sem_indice_ou_antes_de_1995_devolve_none(ano: int) -> None:
    assert c.deflacionar(D(100), ano, 2024, {1994: D(1), 2024: D(2)}) is None


def test_deflacionar_valor_ausente() -> None:
    assert c.deflacionar(None, 2024, 2024, {2024: D(1)}) is None


def test_decomposicao_soma_100() -> None:
    d = c.decompor_crescimento(D(100), D(110), D(300), D(660))
    assert d is not None and not d.estavel
    assert d.variacao_producao_pct == D(120)
    assert d.parte_area_pct is not None and d.parte_rendimento_pct is not None
    assert abs(d.parte_area_pct + d.parte_rendimento_pct - D(100)) < D("0.0001")
    assert d.parte_rendimento_pct > d.parte_area_pct


def test_decomposicao_com_forcas_opostas_ainda_soma_100() -> None:
    d = c.decompor_crescimento(D(100), D(150), D(100), D(120))  # área sobe, rendimento cai
    assert d is not None and d.parte_rendimento_pct is not None and d.parte_rendimento_pct < 0
    assert abs(d.parte_area_pct + d.parte_rendimento_pct - D(100)) < D("0.0001")


@pytest.mark.parametrize(
    "args", [(D(0), D(1), D(1), D(1)), (None, D(1), D(1), D(1)), (D(1), D(1), D(-1), D(1))]
)
def test_decomposicao_sem_base_devolve_none(args: tuple) -> None:
    assert c.decompor_crescimento(*args) is None


def test_decomposicao_estavel_nao_divide() -> None:
    d = c.decompor_crescimento(D(100), D(100), D(500), D(500))
    assert d is not None and d.estavel and d.parte_area_pct is None


def test_perda_e_valor_por_hectare() -> None:
    assert c.perda_lavoura(D(200), D(150)) == D(25)
    assert c.perda_lavoura(D(0), D(0)) is None
    assert c.perda_lavoura(None, D(1)) is None
    assert c.valor_por_hectare(D(30), D(10)) == D(3000)
    assert c.valor_por_hectare(D(30), D(0)) is None


def test_participacoes_hhi_e_top() -> None:
    v = {"a": D(50), "b": D(30), "c": D(20)}
    assert c.participacoes(v) == {"a": D(50), "b": D(30), "c": D(20)}
    assert c.hhi(v) == D(3800)
    assert c.hhi({}) is None
    assert c.top_com_demais(v, n=2) == [("a", D(50)), ("b", D(30)), ("demais", D(20))]
    assert c.top_com_demais(v, n=3) == [("a", D(50)), ("b", D(30)), ("c", D(20))]


def test_dominante_com_empate_e_dependencia() -> None:
    assert c.cultura_dominante({"soja": D(10), "cafe": D(10)}) == "cafe"
    assert c.cultura_dominante({}) is None
    assert c.dependencia({"soja": D(60), "milho": D(40)}) == ("soja", D(60))
    assert c.dependencia({"soja": D(50), "milho": D(50)}) is None


def test_somar_por_grupo_ignora_sem_grupo() -> None:
    assert c.somar_por_grupo({"1": D(1), "2": D(2), "3": D(3)}, {"1": "A", "2": "A", "3": ""}) == {"A": D(3)}


def test_indice_base_100() -> None:
    assert c.indice_base_100([(2020, D(50)), (2021, None), (2022, D(75))]) == [
        (2020, D(100)), (2021, None), (2022, D(150))
    ]
    assert c.indice_base_100([(2020, None), (2021, D(5))]) == [(2020, None), (2021, None)]


def test_produtividade_leite() -> None:
    assert c.produtividade_leite(D(3000), D(1000)) == D(3000)  # 3.000 mil L / 1.000 vacas
    assert c.produtividade_leite(D(1), D(0)) is None
