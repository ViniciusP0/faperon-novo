"""Monta cada bloco do Observatório: lê (leitura), calcula (calculos) e escreve (regras)."""

from decimal import Decimal
from typing import Any

from analise.regras import classificar_concentracao
from indicadores.catalogo import FONTES
from indicadores.erros import ConsultaInvalida, NaoEncontrado
from indicadores.servicos import formatar_data
from observatorio import calculos as c
from observatorio import leitura
from observatorio import regras as r


def referencia_monetaria(ano: int, indices: dict[int, Decimal]) -> tuple[int | None, list[str]]:
    if not indices:
        return None, []
    if ano in indices:
        return ano, []
    anteriores = [a for a in indices if a <= ano]
    usado = max(anteriores) if anteriores else max(indices)
    return usado, [r.aviso_ano_ref(ano, usado)]


def meta(tabelas: list[int]) -> dict[str, Any]:
    return {
        "fontes": [
            {"fonte": FONTES[t].nome, "tabela_sidra": t, "url_fonte": FONTES[t].url}
            for t in tabelas
        ],
        "atualizado_em": formatar_data(leitura.atualizado_em(tabelas)),
    }


def f(valor: Decimal | None, casas: int = 2) -> float | None:
    """Decimal → float arredondado para a resposta (None continua None)."""
    return None if valor is None else round(float(valor), casas)


VALOR = "valor-da-producao"
TABELAS_VALOR = (5457, 74)
JANELAS = (5, 10, 20)


def _vazio(
    bloco: str,
    filtros: dict[str, Any],
    tabelas: list[int],
    ano_ref: int | None = None,
    motivo: str = r.AVISO_SEM_DADOS,
    avisos: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "filtros": filtros,
        "metricas": {},
        "series": {},
        "texto": {"manchete": motivo, "como_ler": r.como_ler(bloco, ano_ref)},
        "qualidade": {
            "municipios_sigilosos": 0,
            "ano_ref_monetario": ano_ref,
            "avisos": [*(avisos or []), motivo],
        },
        "meta": meta(tabelas),
    }


def _validar_ano(ano: int, disponiveis: list[int]) -> None:
    if ano not in disponiveis:
        raise ConsultaInvalida(
            f"Não há dados para {ano}",
            {"ano": f"use um ano entre {disponiveis[0]} e {disponiveis[-1]}"},
        )


def _anos_da_janela(inicio: int, fim: int, anos: list[int]) -> list[int]:
    """Anos a percorrer: a janela pedida cortada ao intervalo com dado (nunca uma lista enorme).

    Janela inteiramente fora dos dados mantém os anos pedidos (limitados pelo teto da API),
    para a série continuar existindo, só que com valores nulos.
    """
    inicio, fim = max(inicio, c.ANO_MINIMO_DADOS), min(fim, c.ANO_MAXIMO)
    dentro = range(max(inicio, anos[0]), min(fim, anos[-1]) + 1)
    return list(dentro) if dentro else list(range(inicio, fim + 1))


def _soma_presentes(valores: list[Decimal | None]) -> float | None:
    """Soma só o que existe; sem nenhum valor o resultado é None, nunca zero."""
    presentes = [v for v in valores if v is not None]
    return f(sum(presentes, Decimal(0))) if presentes else None


def panorama(ano: int | None, janela: int) -> dict[str, Any]:
    tabelas = [5457, 74, 1737]
    anos = leitura.anos_disponiveis(VALOR, 5457)
    if not anos:
        filtros_vazios = {
            "valores": {"ano": None, "janela": janela, "inicio": None},
            "opcoes": {"anos": [], "janelas": list(JANELAS)},
        }
        return _vazio("panorama", filtros_vazios, tabelas)
    ano = anos[-1] if ano is None else ano
    _validar_ano(ano, anos)
    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(ano, indices)
    inicio = ano - janela + 1
    recortado = inicio < c.ANO_MINIMO_DEFLACAO
    if recortado:
        inicio = c.ANO_MINIMO_DEFLACAO
    filtros = {
        "valores": {"ano": ano, "janela": janela, "inicio": inicio},
        "opcoes": {"anos": anos, "janelas": list(JANELAS)},
    }
    if ano_ref is None:  # sem nenhum IPCA carregado não há valor real
        return _vazio("panorama", filtros, tabelas, None, r.AVISO_SEM_IPCA, avisos)
    avisos.insert(0, r.AVISO_SEM_CARNE)
    if recortado:
        avisos.append(r.aviso_inicio_recortado(ano - janela + 1, c.ANO_MINIMO_DEFLACAO))

    nomes: dict[str, str] = {}
    reais: dict[str, dict[int, Decimal]] = {}
    origem_animal: set[str] = set()
    for tabela in TABELAS_VALOR:
        nomes |= leitura.produtos(tabela)
        for slug, por_ano in leitura.totais_por_produto(
            VALOR, tabela, inicio, ano, sem_duplicados=True
        ).items():
            reais[slug] = {
                a: v
                for a, valor in por_ano.items()
                if ano_ref is not None
                and (v := c.deflacionar(valor, a, ano_ref, indices)) is not None
            }
            if tabela == 74:
                origem_animal.add(slug)

    no_ano = {s: v[ano] for s, v in reais.items() if ano in v}
    no_inicio = {s: v[inicio] for s, v in reais.items() if inicio in v}
    if not no_ano:  # há dado bruto no ano (ele sai de anos), mas sem IPCA para corrigi-lo
        return _vazio("panorama", filtros, tabelas, ano_ref, r.AVISO_SEM_IPCA, avisos)
    total = sum(no_ano.values(), Decimal(0))
    total_ini = sum(no_inicio.values(), Decimal(0))
    partes = c.participacoes(no_ano)
    partes_ini = c.participacoes(no_inicio)
    topo = c.top_com_demais(no_ano)
    chaves_topo = [s for s, _ in topo if s != c.DEMAIS]

    def nome(slug: str) -> str:
        return "Demais produtos" if slug == c.DEMAIS else nomes[slug]

    composicao = [
        {"slug": s, "nome": nome(s), "valor": f(v), "participacao": f(v / total * 100, 1)}
        for s, v in topo
    ]
    anos_janela = list(range(inicio, ano + 1))
    evolucao_itens = [
        {"slug": s, "nome": nome(s), "valores": [f(reais[s].get(a)) for a in anos_janela]}
        for s in chaves_topo
    ]
    if any(s == c.DEMAIS for s, _ in topo):
        resto = [s for s in reais if s not in chaves_topo]
        evolucao_itens.append(
            {
                "slug": c.DEMAIS,
                "nome": nome(c.DEMAIS),
                "valores": [_soma_presentes([reais[s].get(a) for s in resto]) for a in anos_janela],
            }
        )

    lider = chaves_topo[0]
    deltas = {s: partes[s] - partes_ini[s] for s in partes if s in partes_ini}
    maior_delta = max(deltas.values(), key=abs) if deltas else None
    area = sum(leitura.por_municipio("area-colhida", 5457, ano).values(), Decimal(0))
    return {
        "filtros": filtros,
        "metricas": {
            "valor_total_real": f(total),
            "valor_lavouras_real": f(
                sum((v for s, v in no_ano.items() if s not in origem_animal), Decimal(0))
            ),
            "valor_origem_animal_real": f(
                sum((v for s, v in no_ano.items() if s in origem_animal), Decimal(0))
            ),
            "variacao_real_pct": f((total - total_ini) / total_ini * 100)
            if total_ini > 0
            else None,
            "area_colhida_ha": f(area, 0),
        },
        "series": {
            "composicao": composicao,
            "evolucao": {"anos": anos_janela, "itens": evolucao_itens},
        },
        "texto": {
            "manchete": r.manchete_panorama(
                ano, ano_ref or ano, nomes[lider], partes[lider], deltas.get(lider), maior_delta
            ),
            "como_ler": r.como_ler("panorama", ano_ref),
        },
        "qualidade": {
            "municipios_sigilosos": leitura.sigilosos(VALOR, 5457, ano),
            "ano_ref_monetario": ano_ref,
            "avisos": avisos,
        },
        "meta": meta(tabelas),
    }


AREA_MINIMA_RANKING = Decimal(1000)


def _perda_comum(plantada: dict[str, Decimal], colhida: dict[str, Decimal]) -> Decimal | None:
    """Perda só sobre municípios que têm área plantada E colhida (evita totais descasados)."""
    comuns = plantada.keys() & colhida.keys()
    if not comuns:
        return None
    return c.perda_lavoura(
        sum((plantada[m] for m in comuns), Decimal(0)),
        sum((colhida[m] for m in comuns), Decimal(0)),
    )


def _estadual(indicador: str, slug: str, inicio: int, fim: int) -> dict[int, Decimal]:
    return leitura.totais_por_produto(indicador, 5457, inicio, fim).get(slug, {})


def crescimento(cultura: str | None, inicio: int | None, fim: int | None) -> dict[str, Any]:
    tabelas = [5457, 1737]
    culturas = leitura.produtos(5457)
    anos = leitura.anos_disponiveis("area-colhida", 5457)
    opcoes = {"culturas": [{"slug": s, "nome": n} for s, n in culturas.items()], "anos": anos}
    if not anos or not culturas:
        vazios = {"valores": {"cultura": cultura, "inicio": inicio, "fim": fim}, "opcoes": opcoes}
        return _vazio("crescimento", vazios, tabelas)
    if cultura is None:
        valores = leitura.totais_por_produto(
            VALOR, 5457, anos[-1], anos[-1], sem_duplicados=True
        )
        cultura = (
            max(valores, key=lambda s: (valores[s].get(anos[-1], Decimal(0)), s))
            if valores
            else next(iter(culturas))
        )
    if cultura not in culturas:
        raise NaoEncontrado(f"Cultura '{cultura}' não existe")
    fim = fim if fim is not None else anos[-1]
    inicio = inicio if inicio is not None else fim - 9
    if inicio > fim:
        raise ConsultaInvalida(
            "O ano inicial não pode ser maior que o ano final", {"inicio": "maior que fim"}
        )
    filtros = {"valores": {"cultura": cultura, "inicio": inicio, "fim": fim}, "opcoes": opcoes}

    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(fim, indices)
    if ano_ref is None:  # só o R$/ha precisa do deflator; o resto do bloco segue normal
        avisos.append(r.AVISO_SEM_IPCA)

    area = _estadual("area-colhida", cultura, inicio, fim)
    producao = _estadual("quantidade-produzida", cultura, inicio, fim)
    anos_janela = _anos_da_janela(inicio, fim, anos)
    rendimento = {a: producao[a] / area[a] for a in anos_janela if a in producao and area.get(a)}
    d = c.decompor_crescimento(
        area.get(inicio), area.get(fim), producao.get(inicio), producao.get(fim)
    )
    plant_mun = leitura.por_municipio_na_janela("area-plantada", 5457, cultura, inicio, fim)
    colh_mun = leitura.por_municipio_na_janela("area-colhida", 5457, cultura, inicio, fim)
    perdas = [(a, _perda_comum(plant_mun.get(a, {}), colh_mun.get(a, {}))) for a in anos_janela]
    perdas_ok = [p for _, p in perdas if p is not None]

    valores_fim = leitura.totais_por_produto(VALOR, 5457, fim, fim)
    areas_fim = leitura.totais_por_produto("area-colhida", 5457, fim, fim)
    rph: list[dict[str, Any]] = []
    duplicados = leitura.componentes_duplicados(5457)  # o agregado já tem a linha do componente
    for slug, nome in culturas.items():
        if slug in duplicados:
            continue
        a = areas_fim.get(slug, {}).get(fim)
        if ano_ref is None or a is None or a < AREA_MINIMA_RANKING:
            continue
        real = c.deflacionar(valores_fim.get(slug, {}).get(fim), fim, ano_ref, indices)
        vph = c.valor_por_hectare(real, a)
        if vph is not None:
            rph.append({"slug": slug, "nome": nome, "valor": f(vph, 0), "participacao": None})
    rph.sort(key=lambda i: (-(i["valor"] or 0), i["slug"]))

    def serie_indice(dados: dict[int, Decimal]) -> list[float | None]:
        return [f(v) for _, v in c.indice_base_100([(a, dados.get(a)) for a in anos_janela])]

    media_perda = sum(perdas_ok, Decimal(0)) / len(perdas_ok) if perdas_ok else None
    return {
        "filtros": filtros,
        "metricas": {
            "variacao_producao_pct": f(d.variacao_producao_pct) if d else None,
            "parte_area_pct": f(d.parte_area_pct) if d else None,
            "parte_rendimento_pct": f(d.parte_rendimento_pct) if d else None,
            "perda_media_pct": f(media_perda),
            "perda_ultimo_ano_pct": f(perdas[-1][1]),
        },
        "series": {
            "indices": {
                "anos": anos_janela,
                "area": serie_indice(area),
                "rendimento": serie_indice(rendimento),
                "producao": serie_indice(producao),
            },
            "perda": [{"ano": a, "valor": f(p)} for a, p in perdas],
            "valor_por_hectare": rph,
        },
        "texto": {
            "manchete": r.manchete_crescimento(culturas[cultura], inicio, fim, d),
            "como_ler": r.como_ler("crescimento", ano_ref),
        },
        "qualidade": {
            "municipios_sigilosos": leitura.sigilosos("quantidade-produzida", 5457, fim, cultura),
            "ano_ref_monetario": ano_ref,
            "avisos": avisos,
        },
        "meta": meta(tabelas),
    }


METRICAS_TERRITORIO = {
    "valor": ("Valor da produção", "Mil Reais"),
    "area": ("Área colhida", "Hectares"),
    "rebanho": ("Rebanho bovino", "Cabeças"),
    "dominante": ("Cultura dominante", ""),
}
MAX_CATEGORIAS = 8


def _corrigir(
    base: dict[str, Decimal], ano: int, ano_ref: int | None, indices: dict[int, Decimal]
) -> dict[str, Decimal]:
    """Valores a preços de ano_ref; o que não pode ser corrigido sai (nunca vira nominal)."""
    if ano_ref is None:
        return {}
    corrigidos = {m: c.deflacionar(v, ano, ano_ref, indices) for m, v in base.items()}
    return {m: v for m, v in corrigidos.items() if v is not None}


def territorio(metrica: str, cultura: str | None, ano: int | None) -> dict[str, Any]:
    tabelas = [5457, 3939, 1737]
    culturas = leitura.produtos(5457)
    if cultura is not None and cultura not in culturas:
        raise NaoEncontrado(f"Cultura '{cultura}' não existe")
    if metrica in ("rebanho", "dominante"):
        cultura = None
    fonte = (
        ("efetivo", 3939)
        if metrica == "rebanho"
        else ("area-colhida", 5457)
        if metrica == "area"
        else (VALOR, 5457)
    )
    anos = leitura.anos_disponiveis(*fonte)
    opcoes = {
        "metricas": [
            {"slug": s, "nome": n, "unidade": u} for s, (n, u) in METRICAS_TERRITORIO.items()
        ],
        "culturas": [{"slug": s, "nome": n} for s, n in culturas.items()],
        "anos": anos,
    }
    if not anos:
        valores_filtro = {"metrica": metrica, "cultura": cultura, "ano": ano}
        return _vazio("territorio", {"valores": valores_filtro, "opcoes": opcoes}, tabelas)
    ano = anos[-1] if ano is None else ano
    _validar_ano(ano, anos)
    filtros = {"valores": {"metrica": metrica, "cultura": cultura, "ano": ano}, "opcoes": opcoes}

    # Só o mapa de valores em reais precisa do deflator. Área, rebanho, participações e
    # dominância comparam números do mesmo ano e seguem sem IPCA.
    monetaria = metrica in ("valor", "dominante")
    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(ano, indices) if monetaria else (None, [])
    produto = "bovino" if metrica == "rebanho" else cultura
    base = leitura.por_municipio(fonte[0], fonte[1], ano, produto)
    valores = _corrigir(base, ano, ano_ref, indices) if monetaria else base
    if monetaria and base and not valores:  # há dado, mas não há como corrigi-lo
        if metrica == "valor":
            return _vazio("territorio", filtros, tabelas, None, r.AVISO_SEM_IPCA, avisos)
        ano_ref, avisos = None, [*avisos, r.AVISO_SEM_IPCA]

    por_produto = leitura.por_municipio_e_produto(VALOR, 5457, ano)
    sigilo_parcial = leitura.municipios_com_sigilo(VALOR, 5457, ano)
    if sigilo_parcial:  # a cultura dominante e a dependência não são confiáveis nesses municípios
        avisos = [*avisos, r.aviso_sigilo_parcial(len(sigilo_parcial))]
    por_produto = {m: v for m, v in por_produto.items() if m not in sigilo_parcial}
    dominantes = {m: c.cultura_dominante(v) for m, v in por_produto.items()}
    frequencia: dict[str, int] = {}
    for d in dominantes.values():
        if d:
            frequencia[d] = frequencia.get(d, 0) + 1
    ranking = sorted(frequencia.items(), key=lambda kv: (-kv[1], kv[0]))
    principais = [s for s, _ in ranking[:MAX_CATEGORIAS]]

    lista_municipios = leitura.municipios()
    nomes_mun = {cod: nome for cod, nome, _ in lista_municipios}
    micro_de = {cod: micro for cod, _, micro in lista_municipios}
    codigos_sigilosos = set(leitura.codigos_sigilosos(fonte[0], fonte[1], ano, produto))
    municipios_saida = []
    for cod, nome, micro in lista_municipios:
        status = "ok" if cod in base else ("sigiloso" if cod in codigos_sigilosos else "sem_dado")
        dom = dominantes.get(cod)
        categoria = (dom if dom in principais else "outras") if (metrica == "dominante" and dom) else None
        municipios_saida.append(
            {
                "codigo_ibge": cod,
                "nome": nome,
                "microrregiao": micro,
                "valor": f(valores.get(cod)),
                "status": status,
                "categoria": categoria,
            }
        )
    soma_micro = c.somar_por_grupo(valores, micro_de)
    microrregioes = [
        {"nome": n, "valor": f(v)}
        for n, v in sorted(soma_micro.items(), key=lambda kv: (-kv[1], kv[0]))
    ]
    dependentes: list[dict[str, Any]] = []
    for cod, vals in por_produto.items():
        dep = c.dependencia(vals)
        if dep:
            dependentes.append(
                {
                    "codigo_ibge": cod,
                    "nome": nomes_mun.get(cod, cod),
                    "cultura": culturas.get(dep[0], dep[0]),
                    "participacao": f(dep[1], 1),
                }
            )
    dependentes.sort(key=lambda d: (-float(d["participacao"] or 0), d["nome"]))

    # Participações só sobre valores OK; o fator de correção é constante no ano e não as altera.
    total_base = sum(base.values(), Decimal(0)) if base else None
    ordenados = sorted(base.items(), key=lambda kv: (-kv[1], kv[0]))
    top5 = sum((v for _, v in ordenados[:5]), Decimal(0)) if ordenados else None
    top5_pct = top5 / total_base * 100 if top5 is not None and total_base else None
    polo = nomes_mun.get(ordenados[0][0]) if ordenados else None
    total = sum(valores.values(), Decimal(0)) if valores else None
    categorias = []
    if metrica == "dominante":
        categorias = [{"slug": s, "nome": culturas[s]} for s in principais]
        if any(m["categoria"] == "outras" for m in municipios_saida):
            categorias.append({"slug": "outras", "nome": "Outras"})
    return {
        "filtros": filtros,
        "metricas": {
            "unidade": METRICAS_TERRITORIO[metrica][1],
            "total": f(total),
            "top5_pct": f(top5_pct, 1),
            "hhi": f(c.hhi(base), 0),
            "concentracao": classificar_concentracao(top5_pct) if top5_pct is not None else None,
        },
        "series": {
            "municipios": municipios_saida,
            "microrregioes": microrregioes,
            "dependentes": dependentes,
            "categorias": categorias,
        },
        "texto": {
            "manchete": r.manchete_territorio(metrica, ano, top5_pct, polo, len(dependentes)),
            "como_ler": r.como_ler("territorio", ano_ref),
        },
        "qualidade": {
            "municipios_sigilosos": len(codigos_sigilosos),
            "ano_ref_monetario": ano_ref,
            "avisos": avisos,
        },
        "meta": meta(tabelas),
    }


SUBTOTAIS_REBANHO = {"galinaceos-total", "suino-matrizes-de-suinos"}
POLOS_LEITE = 5


def _estadual_tabela(
    indicador: str, tabela: int, slug: str, inicio: int, fim: int
) -> dict[int, Decimal]:
    return leitura.totais_por_produto(indicador, tabela, inicio, fim).get(slug, {})


def _produtividade_comum(volume: dict[str, Decimal], vacas: dict[str, Decimal]) -> Decimal | None:
    """L/vaca só sobre municípios com volume E vacas OK (nunca dois totais independentes)."""
    comuns = volume.keys() & vacas.keys()
    if not comuns:
        return None
    return c.produtividade_leite(
        sum((volume[m] for m in comuns), Decimal(0)), sum((vacas[m] for m in comuns), Decimal(0))
    )


def pecuaria(rebanho: str | None, inicio: int | None, fim: int | None) -> dict[str, Any]:
    tabelas = [3939, 74, 94, 1737]
    rebanhos = leitura.produtos(3939)
    rebanho = rebanho or "bovino"
    if rebanhos and rebanho not in rebanhos:
        raise NaoEncontrado(f"Rebanho '{rebanho}' não existe")
    anos = leitura.anos_disponiveis("efetivo", 3939)
    opcoes = {"rebanhos": [{"slug": s, "nome": n} for s, n in rebanhos.items()], "anos": anos}
    if not anos:
        valores_vazios = {"rebanho": rebanho, "inicio": inicio, "fim": fim}
        return _vazio("pecuaria", {"valores": valores_vazios, "opcoes": opcoes}, tabelas)
    fim = fim if fim is not None else anos[-1]
    inicio = inicio if inicio is not None else fim - 9
    if inicio > fim:
        raise ConsultaInvalida(
            "O ano inicial não pode ser maior que o ano final", {"inicio": "maior que fim"}
        )

    efetivo = _estadual_tabela("efetivo", 3939, rebanho, inicio, fim)
    anos_janela = _anos_da_janela(inicio, fim, anos)
    fin = efetivo.get(fim)
    # A variação só compara municípios com valor OK nos dois anos; quem some de um lado
    # (sigilo ou ausência) não pode inventar crescimento nem queda.
    mun_janela = leitura.por_municipio_na_janela("efetivo", 3939, rebanho, inicio, fim)
    em_inicio, em_fim = mun_janela.get(inicio, {}), mun_janela.get(fim, {})
    comuns = em_inicio.keys() & em_fim.keys()
    soma_ini = sum((em_inicio[m] for m in comuns), Decimal(0))
    soma_fim = sum((em_fim[m] for m in comuns), Decimal(0))
    variacao = (soma_fim - soma_ini) / soma_ini * 100 if comuns and soma_ini > 0 else None
    fora_da_base = len(em_inicio.keys() | em_fim.keys()) - len(comuns)
    por_mun = leitura.por_municipio("efetivo", 3939, fim, rebanho)
    nomes_mun = {cod: nome for cod, nome, _ in leitura.municipios()}
    ordenados = sorted(por_mun.items(), key=lambda kv: (-kv[1], kv[0]))
    total = sum(por_mun.values(), Decimal(0))
    top5_pct = sum((v for _, v in ordenados[:5]), Decimal(0)) / total * 100 if total else None
    composicao_bruta = {
        s: v[fim]
        for s, v in leitura.totais_por_produto("efetivo", 3939, fim, fim).items()
        if s not in SUBTOTAIS_REBANHO and v.get(fim) is not None
    }
    partes = c.participacoes(composicao_bruta)
    composicao = [
        {
            "slug": s,
            "nome": rebanhos[s],
            "valor": f(v, 0),
            "participacao": f(partes.get(s), 1),
        }
        for s, v in sorted(composicao_bruta.items(), key=lambda kv: (-kv[1], kv[0]))
    ]

    # Só o valor real do leite precisa do IPCA; rebanho, polos e produtividade seguem sem ele.
    indices = leitura.indices_ipca()
    ano_ref, avisos = referencia_monetaria(fim, indices)
    if ano_ref is None:
        avisos.append(r.AVISO_SEM_IPCA)
    volume = _estadual_tabela("producao-de-origem-animal", 74, "leite", fim, fim)
    valor_leite = _estadual_tabela(VALOR, 74, "leite", fim, fim).get(fim)
    vol_janela = leitura.por_municipio_na_janela(
        "producao-de-origem-animal", 74, "leite", inicio, fim
    )
    vac_janela = leitura.por_municipio_na_janela(
        "vacas-ordenhadas", 94, "vacas-ordenhadas", inicio, fim
    )
    prod_ini = _produtividade_comum(vol_janela.get(inicio, {}), vac_janela.get(inicio, {}))
    prod_fim = _produtividade_comum(vol_janela.get(fim, {}), vac_janela.get(fim, {}))
    var_prod = (prod_fim - prod_ini) / prod_ini * 100 if prod_ini and prod_fim is not None else None
    leite = None
    if volume.get(fim) is not None:
        real = c.deflacionar(valor_leite, fim, ano_ref, indices) if ano_ref is not None else None
        leite = {
            "volume_mil_litros": f(volume[fim], 0),
            "valor_real": f(real),
            "produtividade_l_vaca": f(prod_fim, 0),
            "variacao_produtividade_pct": f(var_prod, 1),
        }
    vol_mun = vol_janela.get(fim, {})
    vacas_mun = vac_janela.get(fim, {})
    polos = [
        {
            "codigo_ibge": cod,
            "nome": nomes_mun.get(cod, cod),
            "volume": f(v, 0),
            "produtividade": f(c.produtividade_leite(v, vacas_mun.get(cod)), 0),
        }
        for cod, v in sorted(vol_mun.items(), key=lambda kv: (-kv[1], kv[0]))[:POLOS_LEITE]
    ]

    if comuns and fora_da_base:
        avisos.append(r.aviso_variacao_base_comum(len(comuns), fora_da_base))
    sig_rebanho = leitura.sigilosos("efetivo", 3939, fim, rebanho)
    sig_leite = len(
        set(leitura.codigos_sigilosos("producao-de-origem-animal", 74, fim, "leite"))
        | set(leitura.codigos_sigilosos("vacas-ordenhadas", 94, fim, "vacas-ordenhadas"))
    )
    if sig_rebanho:
        avisos.append(r.aviso_sigilo_pecuaria(sig_rebanho, "rebanho"))
    if sig_leite:
        avisos.append(r.aviso_sigilo_pecuaria(sig_leite, "leite"))
    return {
        "filtros": {"valores": {"rebanho": rebanho, "inicio": inicio, "fim": fim}, "opcoes": opcoes},
        "metricas": {
            "efetivo_final": f(fin, 0),
            "variacao_pct": f(variacao, 1),
            "top5_pct": f(top5_pct, 1),
            "leite": leite,
        },
        "series": {
            "efetivo": [{"ano": a, "valor": f(efetivo.get(a), 0)} for a in anos_janela],
            "municipios": [
                {"codigo_ibge": cod, "nome": nomes_mun.get(cod, cod), "valor": f(v, 0)}
                for cod, v in ordenados
            ],
            "composicao": composicao,
            "leite_polos": polos,
        },
        "texto": {
            "manchete": r.manchete_pecuaria(
                rebanhos.get(rebanho, rebanho),
                inicio,
                fim,
                variacao,
                nomes_mun.get(ordenados[0][0]) if ordenados else None,
                var_prod,
            ),
            "como_ler": r.como_ler("pecuaria", ano_ref),
        },
        "qualidade": {
            "municipios_sigilosos": sig_rebanho,
            "ano_ref_monetario": ano_ref,
            "avisos": avisos,
        },
        "meta": meta(tabelas),
    }
