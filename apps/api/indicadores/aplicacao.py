"""Escrita no modelo de leitura a partir do staging da Ingestão (interface publicada do núcleo)."""

import logging
from decimal import Decimal

from django.db import connection
from django.utils.text import slugify

from indicadores.catalogo import INDICADORES
from indicadores.models import Indicador, Medicao, Municipio, Produto, ProdutoIndicador
from ingestao.models import Carga, StagingMedicao

log = logging.getLogger(__name__)

UPSERT_MEDICOES = """
INSERT INTO fato_medicao (produto_id, indicador_id, municipio_id, ano, valor, status_valor, carga_id)
SELECT p.id, i.id, s.municipio_codigo, s.ano, s.valor, s.status_valor, s.carga_id
FROM staging_medicao s
JOIN dim_produto p ON p.tabela_origem = s.tabela AND p.codigo_ibge = s.produto_codigo
JOIN dim_indicador i ON i.codigo_ibge = s.indicador_codigo
WHERE s.carga_id = %s
ORDER BY s.id
ON CONFLICT (produto_id, indicador_id, municipio_id, ano) DO UPDATE
SET valor = EXCLUDED.valor, status_valor = EXCLUDED.status_valor, carga_id = EXCLUDED.carga_id
WHERE fato_medicao.valor IS DISTINCT FROM EXCLUDED.valor
   OR fato_medicao.status_valor IS DISTINCT FROM EXCLUDED.status_valor
"""


# Fatos da tabela que a fonte deixou de publicar (ex.: valor revisado para "-"): saem na carga completa.
DELETE_AUSENTES = """
DELETE FROM fato_medicao f
USING dim_produto p
WHERE f.produto_id = p.id
  AND p.tabela_origem = %s
  AND NOT EXISTS (
    SELECT 1
    FROM staging_medicao s
    JOIN dim_indicador i ON i.codigo_ibge = s.indicador_codigo
    WHERE s.carga_id = %s
      AND s.produto_codigo = p.codigo_ibge
      AND i.id = f.indicador_id
      AND s.municipio_codigo = f.municipio_id
      AND s.ano = f.ano
  )
"""

# Salvaguarda: carga que veio com menos que isto do que já existia é tratada como suspeita (fonte
# incompleta ou fora do ar) e não apaga nada.
MINIMO_PARA_PODAR_PERCENTUAL = 90


def contar_fatos_da_tabela(tabela: int) -> int:
    return Medicao.objects.filter(produto__tabela_origem=tabela).count()


def remover_fatos_ausentes(carga: Carga, existentes_antes: int) -> int:
    """Apaga os fatos da tabela cuja chave não veio no staging desta carga COMPLETA.

    Só roda se o staging tiver ao menos 90% das linhas que existiam; senão registra aviso e não
    apaga. Deve rodar na mesma transação do upsert. Retorna quantas linhas apagou.
    """
    recebidas = StagingMedicao.objects.filter(carga=carga).count()
    if existentes_antes and recebidas * 100 < existentes_antes * MINIMO_PARA_PODAR_PERCENTUAL:
        log.warning(
            "tabela %s: a carga trouxe %s linhas para %s existentes (menos de %s%%); "
            "não apagou nenhum fato ausente",
            carga.tabela,
            recebidas,
            existentes_antes,
            MINIMO_PARA_PODAR_PERCENTUAL,
        )
        return 0
    with connection.cursor() as cursor:
        cursor.execute(DELETE_AUSENTES, [carga.tabela, carga.pk])
        apagadas = int(cursor.rowcount)
    if apagadas:
        log.info("tabela %s: %s fatos deixaram de ser publicados pela fonte e foram removidos", carga.tabela, apagadas)
    return apagadas

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


def gravar_indices_preco(carga: Carga, medias: dict[int, Decimal]) -> int:
    """Upsert do IPCA médio anual (interface publicada do núcleo para a Ingestão)."""
    from indicadores.models import IndicePreco

    for ano, indice in medias.items():
        IndicePreco.objects.update_or_create(
            ano=ano, defaults={"indice_medio": indice, "carga": carga}
        )
    return len(medias)
