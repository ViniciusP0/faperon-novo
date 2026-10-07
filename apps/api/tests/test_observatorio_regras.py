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
        "Em 2024, os cinco maiores municípios concentraram 72,5% do valor das lavouras (concentração alta); "
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


def test_crescimento_forcas_opostas_crescimento() -> None:
    p = "A produção de Soja cresceu 20,0% entre 2015 e 2024"
    assert r.manchete_crescimento(
        "Soja", 2015, 2024, Decomposicao(D(20), D("130"), D("-30"), False)
    ) == (p + ", puxada pela expansão de área, enquanto a produtividade recuou.")
    assert r.manchete_crescimento(
        "Soja", 2015, 2024, Decomposicao(D(20), D("-30"), D("130"), False)
    ) == (p + ", puxada por ganho de produtividade, enquanto a área colhida recuou.")


def test_crescimento_forcas_opostas_queda() -> None:
    p = "A produção de Soja caiu 20,0% entre 2015 e 2024"
    assert r.manchete_crescimento(
        "Soja", 2015, 2024, Decomposicao(D(-20), D("-30"), D("130"), False)
    ) == (p + ": a queda de produtividade mais que compensou a expansão de área.")
    assert r.manchete_crescimento(
        "Soja", 2015, 2024, Decomposicao(D(-20), D("130"), D("-30"), False)
    ) == (p + ": a redução de área mais que compensou o ganho de produtividade.")


def test_crescimento_estavel_e_queda_por_area() -> None:
    assert r.manchete_crescimento("Soja", 2015, 2024, Decomposicao(D("0.5"), None, None, True)) == (
        "A produção de Soja ficou estável entre 2015 e 2024."
    )
    assert r.manchete_crescimento("Soja", 2015, 2024, Decomposicao(D("5"), None, None, False)) == (
        "A produção de Soja ficou estável entre 2015 e 2024."
    )
    assert r.manchete_crescimento(
        "Soja", 2015, 2024, Decomposicao(D(-20), D("70"), D("30"), False)
    ) == (
        "A produção de Soja caiu 20,0% entre 2015 e 2024, puxada principalmente pela redução de área."
    )


def test_territorio_ramos() -> None:
    base = (
        "Em 2024, os cinco maiores municípios concentraram 72,5% da área colhida "
        "(concentração alta); Ariquemes é o principal polo."
    )
    assert r.manchete_territorio("area", 2024, D("72.5"), "Ariquemes", 0) == base
    assert r.manchete_territorio("area", 2024, D("72.5"), "Ariquemes", 1) == base
    assert r.manchete_territorio("valor", 2024, D("72.5"), "Ariquemes", 1).endswith(
        " 1 município depende de uma só cultura para mais da metade do valor agrícola."
    )
    assert r.manchete_territorio("area", 2024, None, "Ariquemes", 0) == r.AVISO_SEM_DADOS
    assert r.manchete_territorio("area", 2024, D("72.5"), None, 0) == r.AVISO_SEM_DADOS


def test_pecuaria_ramos() -> None:
    assert r.manchete_pecuaria("Bovino", 2015, 2024, D("-10"), "Ariquemes", None) == (
        "O rebanho bovino caiu 10,0% entre 2015 e 2024; Ariquemes é o principal polo."
    )
    assert r.manchete_pecuaria("Bovino", 2015, 2024, D("0"), "Ariquemes", D("-5")) == (
        "O rebanho bovino ficou estável entre 2015 e 2024; Ariquemes é o principal polo. "
        "A produtividade do leite variou -5,0% no período."
    )
    assert r.manchete_pecuaria("Bovino", 2015, 2024, None, "Ariquemes", None) == r.AVISO_SEM_DADOS


def test_panorama_ramos() -> None:
    base = "Em 2024, Soja respondeu por 38,2% do valor da produção agropecuária de Rondônia"
    assert r.manchete_panorama(2024, 2024, "Soja", D("38.2"), None, D("2.1")) == base + "."
    assert r.manchete_panorama(2024, 2024, "Soja", D("38.2"), D("-2.1"), D("-2.1")) == (
        base + ", -2,1 p.p. em relação ao início do período."
    )
    assert r.manchete_panorama(2024, 2024, "Soja", D("38.2"), D("-0.3"), D("-0.8")) == (
        base + "; a composição ficou estável no período (nenhum item variou 1 p.p. ou mais)."
    )


def test_como_ler_sem_ano_ref_e_avisos() -> None:
    assert r.como_ler("panorama", None)[0] == (
        "Os valores são mostrados sem correção monetária, pois não há IPCA disponível para o período; "
        "a variação inclui o efeito da inflação."
    )
    for bloco in ("panorama", "crescimento", "territorio", "pecuaria"):
        textos = r.como_ler(bloco, None)
        assert 2 <= len(textos) <= 3
        assert "a preços de" not in " ".join(textos)
        assert "None" not in " ".join(textos)
    assert r.como_ler("crescimento", None)[2] == (
        "A perda de lavoura é a parte da área plantada que não foi colhida; "
        "o valor por hectare está sem correção monetária."
    )
    assert r.AVISO_SEM_CARNE == (
        "O valor da produção soma lavouras (PAM) e produtos de origem animal (PPM); "
        "não inclui carne bovina nem abate, que a PPM não publica."
    )
    assert r.AVISO_SEM_DADOS == "Não há dados publicados pelo IBGE para este recorte."


def test_aviso_sem_ipca() -> None:
    assert r.AVISO_SEM_IPCA == (
        "Não é possível calcular valores reais: o IPCA necessário para corrigir "
        "os valores deste ano não está disponível."
    )


def test_aviso_sigilo_parcial() -> None:
    assert r.aviso_sigilo_parcial(1) == (
        "1 município com dado sigiloso para alguma cultura fica sem cultura dominante "
        "e fora da lista de dependentes."
    )
    assert r.aviso_sigilo_parcial(3) == (
        "3 municípios com dado sigiloso para alguma cultura ficam sem cultura dominante "
        "e fora da lista de dependentes."
    )
