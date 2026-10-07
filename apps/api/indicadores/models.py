from django.db import models


class Segmento(models.TextChoices):
    AGRICULTURA = "agricultura", "Agricultura"
    PECUARIA = "pecuaria", "Pecuária"


class Agregacao(models.TextChoices):
    SOMA = "soma", "Soma"
    MEDIA_PONDERADA = "media_ponderada", "Média ponderada"
    NAO_AGREGAVEL = "nao_agregavel", "Não agregável"


class StatusValor(models.TextChoices):
    OK = "ok", "Ok"
    SIGILOSO = "sigiloso", "Sigiloso"
    INEXISTENTE = "inexistente", "Inexistente"


class Produto(models.Model):
    slug = models.SlugField(max_length=120, unique=True)
    codigo_ibge = models.CharField(max_length=20)
    nome = models.CharField(max_length=200)
    segmento = models.CharField(max_length=20, choices=Segmento.choices)
    tabela_origem = models.PositiveIntegerField()

    class Meta:
        db_table = "dim_produto"
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["tabela_origem", "codigo_ibge"], name="produto_unico_por_tabela"
            )
        ]

    def __str__(self) -> str:
        return self.nome


class Indicador(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    codigo_ibge = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=120)
    agregacao = models.CharField(max_length=20, choices=Agregacao.choices)

    class Meta:
        db_table = "dim_indicador"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class ProdutoIndicador(models.Model):
    """Indicadores publicados para um produto, com a unidade que o IBGE informa para ele."""

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="indicadores")
    indicador = models.ForeignKey(Indicador, on_delete=models.CASCADE, related_name="produtos")
    unidade = models.CharField(max_length=100)

    class Meta:
        db_table = "dim_produto_indicador"
        constraints = [
            models.UniqueConstraint(fields=["produto", "indicador"], name="produto_indicador_unico")
        ]


class Municipio(models.Model):
    codigo_ibge = models.CharField(max_length=7, primary_key=True)
    nome = models.CharField(max_length=100)
    microrregiao = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        db_table = "dim_municipio"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Medicao(models.Model):
    """Valor de um Indicador para um Produto, Município e Ano.

    Linha ausente significa 'inexistente' (IBGE publica "-" ou "..."); 'X' vira sigiloso.
    """

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="medicoes")
    indicador = models.ForeignKey(Indicador, on_delete=models.CASCADE, related_name="medicoes")
    municipio = models.ForeignKey(Municipio, on_delete=models.CASCADE, related_name="medicoes")
    ano = models.PositiveSmallIntegerField()
    valor = models.DecimalField(max_digits=22, decimal_places=4, null=True)
    status_valor = models.CharField(max_length=12, choices=StatusValor.choices)
    carga = models.ForeignKey("ingestao.Carga", on_delete=models.PROTECT, related_name="medicoes")

    class Meta:
        db_table = "fato_medicao"
        constraints = [
            models.UniqueConstraint(
                fields=["produto", "indicador", "municipio", "ano"], name="medicao_unica"
            ),
            models.CheckConstraint(
                condition=models.Q(status_valor="ok", valor__isnull=False)
                | ~models.Q(status_valor="ok") & models.Q(valor__isnull=True),
                name="medicao_valor_coerente_com_status",
            ),
        ]
        indexes = [models.Index(fields=["produto", "indicador", "ano"], name="medicao_recorte")]


class IndicePreco(models.Model):
    """IPCA médio do ano (média dos 12 números-índice mensais). Ano incompleto não é gravado."""

    ano = models.PositiveSmallIntegerField(primary_key=True)
    indice_medio = models.DecimalField(max_digits=22, decimal_places=6)
    carga = models.ForeignKey("ingestao.Carga", on_delete=models.PROTECT, related_name="indices")

    class Meta:
        db_table = "dim_indice_preco"
        ordering = ["ano"]
