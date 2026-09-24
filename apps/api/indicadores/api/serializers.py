from rest_framework import serializers

from indicadores.models import Agregacao, Segmento, StatusValor


class ProdutoSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()
    segmento = serializers.ChoiceField(choices=Segmento.choices)
    tabela_sidra = serializers.IntegerField()


class ProdutoRefSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()
    segmento = serializers.ChoiceField(choices=Segmento.choices)


class IndicadorSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()
    unidade = serializers.CharField()
    agregacao = serializers.ChoiceField(choices=Agregacao.choices)


class MunicipioSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()


class MetaSerializer(serializers.Serializer):
    fonte = serializers.CharField()
    tabela_sidra = serializers.IntegerField()
    url_fonte = serializers.URLField()
    atualizado_em = serializers.CharField(allow_null=True)


class PontoSerializer(serializers.Serializer):
    ano = serializers.IntegerField()
    valor = serializers.FloatField(allow_null=True)
    status = serializers.ChoiceField(choices=StatusValor.choices)


class RankingItemSerializer(serializers.Serializer):
    posicao = serializers.IntegerField(allow_null=True)
    municipio = MunicipioSerializer()
    valor = serializers.FloatField(allow_null=True)
    status = serializers.ChoiceField(choices=StatusValor.choices)
    percentual_total = serializers.FloatField(allow_null=True)


class RankingSerializer(serializers.Serializer):
    produto = ProdutoRefSerializer()
    indicador = IndicadorSerializer()
    inicio = serializers.IntegerField()
    fim = serializers.IntegerField()
    ano_referencia = serializers.IntegerField()
    total_estadual = serializers.FloatField(allow_null=True)
    itens = RankingItemSerializer(many=True)
    meta = MetaSerializer()


class SerieSerializer(serializers.Serializer):
    produto = ProdutoRefSerializer()
    indicador = IndicadorSerializer()
    municipio = MunicipioSerializer(allow_null=True)
    inicio = serializers.IntegerField()
    fim = serializers.IntegerField()
    pontos = PontoSerializer(many=True)
    meta = MetaSerializer()


class SerieNomeadaSerializer(serializers.Serializer):
    id = serializers.CharField()
    nome = serializers.CharField()
    pontos = PontoSerializer(many=True)


class ComparacaoSerializer(serializers.Serializer):
    modo = serializers.ChoiceField(choices=["municipios", "produtos"])
    indicador = IndicadorSerializer()
    unidade = serializers.CharField()
    inicio = serializers.IntegerField()
    fim = serializers.IntegerField()
    anos = serializers.ListField(child=serializers.IntegerField())
    series = SerieNomeadaSerializer(many=True)
    meta = MetaSerializer()


class CargaResumoSerializer(serializers.Serializer):
    tabela = serializers.IntegerField()
    status = serializers.CharField()
    concluida_em = serializers.CharField(allow_null=True)
    linhas = serializers.IntegerField()


class IntervaloAnosSerializer(serializers.Serializer):
    min = serializers.IntegerField(allow_null=True)
    max = serializers.IntegerField(allow_null=True)


class MetaGeralSerializer(serializers.Serializer):
    ultima_carga = serializers.CharField(allow_null=True)
    cargas = CargaResumoSerializer(many=True)
    anos = IntervaloAnosSerializer()


class DestaqueLiderSerializer(serializers.Serializer):
    municipio = MunicipioSerializer()
    valor = serializers.FloatField(allow_null=True)
    percentual_total = serializers.FloatField(allow_null=True)


class DestaqueSerializer(serializers.Serializer):
    chave = serializers.CharField()
    rotulo = serializers.CharField()
    produto = ProdutoRefSerializer()
    indicador = IndicadorSerializer()
    ano_referencia = serializers.IntegerField()
    total = serializers.FloatField(allow_null=True)
    serie = PontoSerializer(many=True)
    variacao_percentual = serializers.FloatField(allow_null=True)
    top = DestaqueLiderSerializer(many=True)
    meta = MetaSerializer()


class DestaquesMetaSerializer(serializers.Serializer):
    atualizado_em = serializers.CharField(allow_null=True)


class DestaquesSerializer(serializers.Serializer):
    itens = DestaqueSerializer(many=True)
    meta = DestaquesMetaSerializer()


class ErroSerializer(serializers.Serializer):
    erro = serializers.CharField()
    campos = serializers.DictField(child=serializers.CharField())


class SaudeSerializer(serializers.Serializer):
    status = serializers.CharField()
    banco = serializers.CharField()


# --- Parâmetros de consulta ---


class ConsultaSerializer(serializers.Serializer):
    produto = serializers.CharField()
    indicador = serializers.CharField()
    inicio = serializers.IntegerField(required=False, min_value=1900, max_value=2100)
    fim = serializers.IntegerField(required=False, min_value=1900, max_value=2100)


class ConsultaSerieSerializer(ConsultaSerializer):
    municipio = serializers.CharField(required=False)


class ConsultaComparacaoSerializer(serializers.Serializer):
    produto = serializers.CharField(required=False)
    produtos = serializers.CharField(required=False, help_text="slugs separados por vírgula")
    indicador = serializers.CharField()
    municipios = serializers.CharField(
        required=False, help_text="códigos IBGE separados por vírgula"
    )
    municipio = serializers.CharField(required=False)
    inicio = serializers.IntegerField(required=False, min_value=1900, max_value=2100)
    fim = serializers.IntegerField(required=False, min_value=1900, max_value=2100)


class ConsultaProdutosSerializer(serializers.Serializer):
    segmento = serializers.ChoiceField(choices=Segmento.choices, required=False)
    q = serializers.CharField(required=False)


class ConsultaIndicadoresSerializer(serializers.Serializer):
    produto = serializers.CharField()
