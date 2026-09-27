import pytest

from analise import graficos
from analise.tendencia import descrever_tendencia, tendencia_linear


def test_ajusta_reta_por_minimos_quadrados() -> None:
    t = tendencia_linear([2020, 2021, 2022, 2023, 2024], [10.0, 20.0, 30.0, 40.0, 50.0])
    assert t is not None
    assert t.inclinacao == pytest.approx(10)
    assert t.valores == pytest.approx([10, 20, 30, 40, 50])
    assert t.r2 == pytest.approx(1)


def test_anos_sem_valor_ficam_fora_do_ajuste_e_nunca_viram_zero() -> None:
    t = tendencia_linear([2020, 2021, 2022, 2023, 2024], [10.0, None, 30.0, None, 50.0])
    assert t is not None
    assert t.inclinacao == pytest.approx(10)  # com zeros no lugar, seria bem menor
    assert len(t.valores) == 5
    assert t.valores[1] == pytest.approx(20)  # a reta atravessa o ano sem dado


def test_ajuste_ruim_tem_r2_baixo() -> None:
    t = tendencia_linear([2020, 2021, 2022, 2023, 2024], [10.0, 50.0, 20.0, 60.0, 30.0])
    assert t is not None
    assert 0 < t.r2 < 0.5


def test_serie_constante_e_horizontal_com_ajuste_perfeito() -> None:
    t = tendencia_linear([2020, 2021, 2022], [7.0, 7.0, 7.0])
    assert t is not None
    assert t.inclinacao == 0
    assert t.r2 == 1


@pytest.mark.parametrize(
    ("anos", "valores"),
    [([], []), ([2020], [5.0]), ([2020, 2021], [5.0, None]), ([2020, 2020], [1.0, 2.0])],
)
def test_sem_dados_suficientes_nao_ha_tendencia(
    anos: list[int], valores: list[float | None]
) -> None:
    assert tendencia_linear(anos, valores) is None


def test_descricao_em_portugues_com_sinal_unidade_e_ajuste() -> None:
    cresce = tendencia_linear([2020, 2021, 2022, 2023], [1000.0, 1500.0, 2000.0, 2500.0])
    assert cresce is not None
    texto = descrever_tendencia(cresce, "Toneladas")
    assert "crescimento médio de +500 toneladas por ano" in texto
    assert "R² = 1,00" in texto
    cai = tendencia_linear([2020, 2021, 2022], [100.0, 80.0, 60.0])
    assert cai is not None
    assert "queda média de −20 cabeças por ano" in descrever_tendencia(cai, "Cabeças")
    plana = tendencia_linear([2020, 2021, 2022], [7.0, 7.0, 7.0])
    assert plana is not None
    assert "estável" in descrever_tendencia(plana, "Hectares")


def test_grafico_desenha_a_linha_tracejada_e_a_legenda() -> None:
    t = tendencia_linear([2022, 2023, 2024], [10.0, None, 30.0])
    assert t is not None
    svg = graficos.grafico_colunas(
        [2022, 2023, 2024], [("Soja", [10.0, None, 30.0])], tendencia=t.valores
    )
    assert svg.count("<polyline") == 1
    assert 'stroke-dasharray="6 4"' in svg
    assert "Tendência linear" in svg
    sem = graficos.grafico_colunas([2022, 2023, 2024], [("Soja", [10.0, None, 30.0])])
    assert "<polyline" not in sem and "Tendência" not in sem


def test_linha_negativa_e_limitada_ao_eixo() -> None:
    svg = graficos.grafico_colunas(
        [2020, 2021, 2022], [("X", [5.0, 3.0, 1.0])], tendencia=[6.0, 2.0, -2.0]
    )
    pontos = svg.split('points="')[1].split('"')[0]
    assert "-" not in pontos and "nan" not in pontos  # coordenadas sempre dentro da área do gráfico
