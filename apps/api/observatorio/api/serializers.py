from rest_framework import serializers


class TextoSerializer(serializers.Serializer):
    manchete = serializers.CharField()
    como_ler = serializers.ListField(child=serializers.CharField())


class QualidadeSerializer(serializers.Serializer):
    municipios_sigilosos = serializers.IntegerField()
    ano_ref_monetario = serializers.IntegerField(allow_null=True)
    avisos = serializers.ListField(child=serializers.CharField())


class FonteSerializer(serializers.Serializer):
    fonte = serializers.CharField()
    tabela_sidra = serializers.IntegerField()
    url_fonte = serializers.URLField()


class MetaObservatorioSerializer(serializers.Serializer):
    fontes = FonteSerializer(many=True)
    atualizado_em = serializers.CharField(allow_null=True)


class OpcaoSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()


class ItemValorSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()
    valor = serializers.FloatField(allow_null=True)
    participacao = serializers.FloatField(allow_null=True)


class AnoValorSerializer(serializers.Serializer):
    ano = serializers.IntegerField()
    valor = serializers.FloatField(allow_null=True)


class ConsultaPanoramaSerializer(serializers.Serializer):
    ano = serializers.IntegerField(required=False)
    janela = serializers.ChoiceField(choices=[5, 10, 20], required=False, default=10)


class SerieItemSerializer(serializers.Serializer):
    slug = serializers.CharField()
    nome = serializers.CharField()
    valores = serializers.ListField(child=serializers.FloatField(allow_null=True))


class EvolucaoSerializer(serializers.Serializer):
    anos = serializers.ListField(child=serializers.IntegerField())
    itens = SerieItemSerializer(many=True)


class PanoramaValoresSerializer(serializers.Serializer):
    ano = serializers.IntegerField(allow_null=True)
    janela = serializers.IntegerField()
    inicio = serializers.IntegerField(allow_null=True)


class PanoramaOpcoesSerializer(serializers.Serializer):
    anos = serializers.ListField(child=serializers.IntegerField())
    janelas = serializers.ListField(child=serializers.IntegerField())


class PanoramaFiltrosSerializer(serializers.Serializer):
    valores = PanoramaValoresSerializer()
    opcoes = PanoramaOpcoesSerializer()


class PanoramaMetricasSerializer(serializers.Serializer):
    valor_total_real = serializers.FloatField(required=False, allow_null=True)
    valor_lavouras_real = serializers.FloatField(required=False, allow_null=True)
    valor_origem_animal_real = serializers.FloatField(required=False, allow_null=True)
    variacao_real_pct = serializers.FloatField(required=False, allow_null=True)
    area_colhida_ha = serializers.FloatField(required=False, allow_null=True)


class PanoramaSeriesSerializer(serializers.Serializer):
    composicao = ItemValorSerializer(many=True, required=False)
    evolucao = EvolucaoSerializer(required=False)


class MunicipioValorSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    valor = serializers.FloatField(allow_null=True)


class PanoramaSerializer(serializers.Serializer):
    filtros = PanoramaFiltrosSerializer()
    metricas = PanoramaMetricasSerializer()
    series = PanoramaSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()
