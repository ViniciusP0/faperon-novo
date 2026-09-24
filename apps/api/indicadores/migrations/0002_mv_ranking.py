from django.db import migrations

CRIAR = """
CREATE MATERIALIZED VIEW mv_ranking AS
SELECT
    produto_id,
    indicador_id,
    ano,
    municipio_id,
    valor,
    status_valor,
    CASE WHEN status_valor = 'ok' THEN
        row_number() OVER (
            PARTITION BY produto_id, indicador_id, ano
            ORDER BY valor DESC NULLS LAST, municipio_id
        )
    END AS posicao
FROM fato_medicao;

CREATE UNIQUE INDEX mv_ranking_pk ON mv_ranking (produto_id, indicador_id, ano, municipio_id);
CREATE INDEX mv_ranking_recorte ON mv_ranking (produto_id, indicador_id, ano);
"""


class Migration(migrations.Migration):
    dependencies = [("indicadores", "0001_initial")]

    operations = [
        migrations.RunSQL(CRIAR, reverse_sql="DROP MATERIALIZED VIEW IF EXISTS mv_ranking"),
    ]
