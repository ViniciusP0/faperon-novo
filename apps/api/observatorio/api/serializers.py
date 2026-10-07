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


class MunicipioValorSerializer(serializers.Serializer):
    codigo_ibge = serializers.CharField()
    nome = serializers.CharField()
    valor = serializers.FloatField(allow_null=True)
