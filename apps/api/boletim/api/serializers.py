from rest_framework import serializers


class ConsultaDiaSerializer(serializers.Serializer):
    origem = serializers.ChoiceField(
        choices=["todas", "estado", "uniao"], default="todas", help_text="Filtro de origem"
    )
    todas = serializers.ChoiceField(
        choices=["0", "1"], default="0", help_text="1 devolve todas as notas, não só 10"
    )


class SituacaoFonteSerializer(serializers.Serializer):
    status = serializers.CharField(help_text="ok, pendente, falha ou sem_coleta")
    erro = serializers.CharField(help_text="Motivo da falha, quando houver")


class FontesSerializer(serializers.Serializer):
    dou = SituacaoFonteSerializer()
    doe = SituacaoFonteSerializer()


class NotaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    origem = serializers.ChoiceField(choices=["estado", "uniao"])
    diario = serializers.CharField(help_text="Ex.: DOE-RO nº 201")
    orgao = serializers.CharField()
    titulo = serializers.CharField()
    resumo = serializers.CharField()
    rondonia = serializers.BooleanField()
    data = serializers.DateField()  # type: ignore[assignment]
    url = serializers.CharField(help_text="Link do ato no diário original")


class DiaBoletimSerializer(serializers.Serializer):
    dia = serializers.DateField()
    destaque = NotaSerializer(allow_null=True)
    notas = NotaSerializer(many=True)
    total = serializers.IntegerField(help_text="Notas relevantes do filtro, destaque incluído")
    fontes = FontesSerializer()


class StatusFontesSerializer(serializers.Serializer):
    dou = serializers.CharField()
    doe = serializers.CharField()


class ResumoDiaSerializer(serializers.Serializer):
    dia = serializers.DateField()
    total = serializers.IntegerField()
    tem_destaque = serializers.BooleanField()
    fontes = StatusFontesSerializer()


class ListaDiasSerializer(serializers.Serializer):
    dias = ResumoDiaSerializer(many=True)
