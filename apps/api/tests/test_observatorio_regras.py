from decimal import Decimal as D

from observatorio import regras as r
from observatorio.calculos import Decomposicao


def test_manchete_panorama_com_mudanca() -> None:
    assert r.manchete_panorama(2024, 2024, "Soja (em grão)", D("38.2"), D("2.1"), D("2.1")) == (
        "Em 2024, Soja (em grão) respondeu por 38,2% do valor da produção agropecuária de Rondônia, "
        "+2,1 p.p. em relação ao início do período."
    )


def test_manchete_panorama_estavel() -> None:
    assert r.manchete_panorama(2024, 2024, "Soja (em grão)", D("38.2"), D("0.3"), D("0.8")) == (
        "Em 2024, Soja (em grão) respondeu por 38,2% do valor da produção agropecuária de Rondônia; "
        "a composição ficou estável no período (nenhum item variou 1 p.p. ou mais)."
    )


def test_manchete_crescimento_produtividade() -> None:
    d = Decomposicao(D(120), D("11.9"), D("88.1"), False)
    assert r.manchete_crescimento("Soja (em grão)", 2015, 2024, d) == (
        "A produção de Soja (em grão) cresceu 120,0% entre 2015 e 2024; "
        "88,1% desse aumento veio de ganho de produtividade e 11,9% de expansão de área."
    )


def test_manchete_crescimento_queda_e_sem_base() -> None:
    queda = Decomposicao(D(-20), D("30"), D("70"), False)
    assert r.manchete_crescimento("Café canéfora", 2015, 2024, queda) == (
        "A produção de Café canéfora caiu 20,0% entre 2015 e 2024, puxada principalmente pela queda de produtividade."
    )
    assert r.manchete_crescimento("Café canéfora", 2015, 2024, None) == (
        "Não há base de comparação para Café canéfora entre 2015 e 2024: "
        "falta área colhida ou produção em um dos anos."
    )


def test_manchete_territorio() -> None:
    assert r.manchete_territorio("valor", 2024, D("72.5"), "Ariquemes", 3) == (
        "Em 2024, os cinco maiores municípios concentraram 72,5% do valor da produção (concentração alta); "
        "Ariquemes é o principal polo. 3 municípios dependem de uma só cultura para mais da metade do valor agrícola."
    )


def test_manchete_pecuaria() -> None:
    assert r.manchete_pecuaria(
        "Bovino", 2015, 2024, D("100"), "Alta Floresta D'Oeste", D("150")
    ) == (
        "O rebanho bovino cresceu 100,0% entre 2015 e 2024; Alta Floresta D'Oeste é o principal polo. "
        "A produtividade do leite variou +150,0% no período."
    )


def test_avisos_e_como_ler() -> None:
    assert r.aviso_ano_ref(2026, 2025) == (
        "O IPCA de 2026 ainda não está fechado; os valores estão a preços de 2025."
    )
    assert r.aviso_inicio_recortado(1992, 1995) == (
        "O período começa em 1995: antes do Plano Real não há como corrigir valores pelo IPCA."
    )
    for bloco in ("panorama", "crescimento", "territorio", "pecuaria"):
        assert 2 <= len(r.como_ler(bloco, 2024)) <= 3
    assert "a preços de 2024" in " ".join(r.como_ler("panorama", 2024))
