"""Escrita no modelo de leitura a partir do staging da Ingestão (interface publicada do núcleo)."""

from django.db import connection
from django.utils.text import slugify

from indicadores.catalogo import INDICADORES
from indicadores.models import Indicador, Municipio, Produto, ProdutoIndicador
from ingestao.models import Carga, StagingMedicao

UPSERT_MEDICOES = """
INSERT INTO fato_medicao (produto_id, indicador_id, municipio_id, ano, valor, status_valor, carga_id)
SELECT p.id, i.id, s.municipio_codigo, s.ano, s.valor, s.status_valor, s.carga_id
FROM staging_medicao s
JOIN dim_produto p ON p.tabela_origem = s.tabela AND p.codigo_ibge = s.produto_codigo
JOIN dim_indicador i ON i.codigo_ibge = s.indicador_codigo
WHERE s.carga_id = %s
ON CONFLICT (produto_id, indicador_id, municipio_id, ano) DO UPDATE
SET valor = EXCLUDED.valor, status_valor = EXCLUDED.status_valor, carga_id = EXCLUDED.carga_id
WHERE fato_medicao.valor IS DISTINCT FROM EXCLUDED.valor
   OR fato_medicao.status_valor IS DISTINCT FROM EXCLUDED.status_valor
"""


def _slug_unico(nome: str, tabela: int) -> str:
    base = slugify(nome)[:110] or f"produto-{tabela}"
    if not Produto.objects.filter(slug=base).exists():
        return base
    return f"{base}-{tabela}"


def garantir_indicadores() -> None:
    for d in INDICADORES.values():
        Indicador.objects.update_or_create(
            codigo_ibge=d.codigo_ibge,
            defaults={"slug": d.slug, "nome": d.nome, "agregacao": d.agregacao},
        )


def promover_staging(carga: Carga, segmento: str, municipios: dict[str, str] | None = None) -> int:
    """Cria dimensões que faltam e faz upsert idempotente dos fatos. Retorna linhas alteradas."""
    staging = StagingMedicao.objects.filter(carga=carga)
    garantir_indicadores()

    for codigo, nome in staging.values_list("produto_codigo", "produto_nome").distinct():
        existente = Produto.objects.filter(tabela_origem=carga.tabela, codigo_ibge=codigo).first()
        if existente is None:
            Produto.objects.create(
                tabela_origem=carga.tabela,
                codigo_ibge=codigo,
                nome=nome,
                segmento=segmento,
                slug=_slug_unico(nome, carga.tabela),
            )
        elif existente.nome != nome:
            existente.nome = nome
            existente.save(update_fields=["nome"])

    conhecidos = dict(staging.values_list("municipio_codigo", "municipio_nome").distinct())
    conhecidos.update(municipios or {})  # inclui municípios só com valores ausentes
    for codigo, nome in conhecidos.items():
        Municipio.objects.update_or_create(codigo_ibge=codigo, defaults={"nome": nome})

    produtos = {p.codigo_ibge: p for p in Produto.objects.filter(tabela_origem=carga.tabela)}
    indicadores = {i.codigo_ibge: i for i in Indicador.objects.all()}
    combinacoes = staging.values_list("produto_codigo", "indicador_codigo", "unidade").distinct()
    for produto_codigo, indicador_codigo, unidade in combinacoes:
        ProdutoIndicador.objects.update_or_create(
            produto=produtos[produto_codigo],
            indicador=indicadores[indicador_codigo],
            defaults={"unidade": unidade},
        )

    with connection.cursor() as cursor:
        cursor.execute(UPSERT_MEDICOES, [carga.pk])
        return int(cursor.rowcount)


def atualizar_views(*args: object, **kwargs: object) -> None:
    """Handler de CargaConcluida: reconstrói a leitura de ranking."""
    with connection.cursor() as cursor:
        cursor.execute("REFRESH MATERIALIZED VIEW mv_ranking")
