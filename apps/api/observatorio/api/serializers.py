from rest_framework import serializers

from observatorio.calculos import ANO_MAXIMO, ANO_MINIMO_DADOS


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
    ano = serializers.IntegerField(required=False, min_value=ANO_MINIMO_DADOS, max_value=ANO_MAXIMO)
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


class ConsultaCrescimentoSerializer(serializers.Serializer):
    cultura = serializers.SlugField(required=False)
    inicio = serializers.IntegerField(
        required=False, min_value=ANO_MINIMO_DADOS, max_value=ANO_MAXIMO
    )
    fim = serializers.IntegerField(
        required=False, min_value=ANO_MINIMO_DADOS, max_value=ANO_MAXIMO
    )


class CrescimentoValoresSerializer(serializers.Serializer):
    cultura = serializers.CharField(allow_null=True)
    inicio = serializers.IntegerField(allow_null=True)
    fim = serializers.IntegerField(allow_null=True)


class CrescimentoOpcoesSerializer(serializers.Serializer):
    culturas = OpcaoSerializer(many=True)
    anos = serializers.ListField(child=serializers.IntegerField())


class CrescimentoFiltrosSerializer(serializers.Serializer):
    valores = CrescimentoValoresSerializer()
    opcoes = CrescimentoOpcoesSerializer()


class CrescimentoMetricasSerializer(serializers.Serializer):
    variacao_producao_pct = serializers.FloatField(required=False, allow_null=True)
    parte_area_pct = serializers.FloatField(required=False, allow_null=True)
    parte_rendimento_pct = serializers.FloatField(required=False, allow_null=True)
    perda_media_pct = serializers.FloatField(required=False, allow_null=True)
    perda_ultimo_ano_pct = serializers.FloatField(required=False, allow_null=True)


class IndicesSerializer(serializers.Serializer):
    anos = serializers.ListField(child=serializers.IntegerField())
    area = serializers.ListField(child=serializers.FloatField(allow_null=True))
    rendimento = serializers.ListField(child=serializers.FloatField(allow_null=True))
    producao = serializers.ListField(child=serializers.FloatField(allow_null=True))


class CrescimentoSeriesSerializer(serializers.Serializer):
    indices = IndicesSerializer(required=False)
    perda = AnoValorSerializer(many=True, required=False)
    valor_por_hectare = ItemValorSerializer(many=True, required=False)


class CrescimentoSerializer(serializers.Serializer):
    filtros = CrescimentoFiltrosSerializer()
    metricas = CrescimentoMetricasSerializer()
    series = CrescimentoSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()


class ConsultaTerritorioSerializer(serializers.Serializer):
    metrica = serializers.ChoiceField(
        choices=["valor", "area", "rebanho", "dominante"], required=False, default="valor"
    )
    cultura = serializers.SlugField(required=False)
    ano = serializers.IntegerField(required=False, min_value=ANO_MINIMO_DADOS, max_value=ANO_MAXIMO)


class MetricaOpcaoSerializer(OpcaoSerializer):
    unidade = serializers.CharField(allow_blank=True)


class TerritorioValoresSerializer(serializers.Serializer):
    metrica = serializers.CharField()
    cultura = serializers.CharField(allow_null=True)
    ano = serializers.IntegerField(allow_null=True)


class TerritorioOpcoesSerializer(serializers.Serializer):
    metricas = MetricaOpcaoSerializer(many=True)
    culturas = OpcaoSerializer(many=True)
    anos = serializers.ListField(child=serializers.IntegerField())


class TerritorioFiltrosSerializer(serializers.Serializer):
    valores = TerritorioValoresSerializer()
    opcoes = TerritorioOpcoesSerializer()


class TerritorioMetricasSerializer(serializers.Serializer):
    unidade = serializers.CharField(required=False, allow_blank=True)
    total = serializers.FloatField(required=False, allow_null=True)
    top5_pct = serializers.FloatField(required=False, allow_null=True)
    hhi = serializers.FloatField(required=False, allow_null=True)
    concentracao = serializers.CharField(required=False, allow_null=True)


class MunicipioMapaSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    microrregiao = serializers.CharField(allow_blank=True)
    valor = serializers.FloatField(allow_null=True)
    status = serializers.ChoiceField(choices=["ok", "sigiloso", "sem_dado"])
    categoria = serializers.CharField(allow_null=True)


class GrupoValorSerializer(serializers.Serializer):
    nome = serializers.CharField()
    valor = serializers.FloatField(allow_null=True)


class DependenteSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    cultura = serializers.CharField()
    participacao = serializers.FloatField(allow_null=True)


class TerritorioSeriesSerializer(serializers.Serializer):
    municipios = MunicipioMapaSerializer(many=True, required=False)
    microrregioes = GrupoValorSerializer(many=True, required=False)
    dependentes = DependenteSerializer(many=True, required=False)
    categorias = OpcaoSerializer(many=True, required=False)


class TerritorioSerializer(serializers.Serializer):
    filtros = TerritorioFiltrosSerializer()
    metricas = TerritorioMetricasSerializer()
    series = TerritorioSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()


class ConsultaPecuariaSerializer(serializers.Serializer):
    rebanho = serializers.SlugField(required=False)
    inicio = serializers.IntegerField(
        required=False, min_value=ANO_MINIMO_DADOS, max_value=ANO_MAXIMO
    )
    fim = serializers.IntegerField(
        required=False, min_value=ANO_MINIMO_DADOS, max_value=ANO_MAXIMO
    )


class PecuariaValoresSerializer(serializers.Serializer):
    rebanho = serializers.CharField()
    inicio = serializers.IntegerField(allow_null=True)
    fim = serializers.IntegerField(allow_null=True)


class PecuariaOpcoesSerializer(serializers.Serializer):
    rebanhos = OpcaoSerializer(many=True)
    anos = serializers.ListField(child=serializers.IntegerField())


class PecuariaFiltrosSerializer(serializers.Serializer):
    valores = PecuariaValoresSerializer()
    opcoes = PecuariaOpcoesSerializer()


class LeiteSerializer(serializers.Serializer):
    volume_mil_litros = serializers.FloatField(allow_null=True)
    valor_real = serializers.FloatField(allow_null=True)
    produtividade_l_vaca = serializers.FloatField(allow_null=True)
    variacao_produtividade_pct = serializers.FloatField(allow_null=True)


class PecuariaMetricasSerializer(serializers.Serializer):
    efetivo_final = serializers.FloatField(required=False, allow_null=True)
    variacao_pct = serializers.FloatField(required=False, allow_null=True)
    top5_pct = serializers.FloatField(required=False, allow_null=True)
    leite = LeiteSerializer(required=False, allow_null=True)


class PoloLeiteSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    volume = serializers.FloatField(allow_null=True)
    produtividade = serializers.FloatField(allow_null=True)


class PecuariaSeriesSerializer(serializers.Serializer):
    efetivo = AnoValorSerializer(many=True, required=False)
    municipios = MunicipioValorSerializer(many=True, required=False)
    composicao = ItemValorSerializer(many=True, required=False)
    leite_polos = PoloLeiteSerializer(many=True, required=False)


class PecuariaSerializer(serializers.Serializer):
    filtros = PecuariaFiltrosSerializer()
    metricas = PecuariaMetricasSerializer()
    series = PecuariaSeriesSerializer()
    texto = TextoSerializer()
    qualidade = QualidadeSerializer()
    meta = MetaObservatorioSerializer()
