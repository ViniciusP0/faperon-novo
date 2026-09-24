from django.db import models


class Carga(models.Model):
    class Status(models.TextChoices):
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        SUCESSO = "sucesso", "Sucesso"
        INALTERADA = "inalterada", "Inalterada"
        FALHA = "falha", "Falha"

    tabela = models.PositiveIntegerField(db_index=True)
    iniciada_em = models.DateTimeField()
    concluida_em = models.DateTimeField(null=True, blank=True)
    linhas = models.PositiveIntegerField(default=0)
    hash = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EM_ANDAMENTO)
    erro = models.TextField(blank=True, default="")

    class Meta:
        db_table = "carga"
        ordering = ["-iniciada_em"]

    def __str__(self) -> str:
        return f"Carga {self.pk} tabela {self.tabela} ({self.status})"


class StagingMedicao(models.Model):
    """Área de passagem: dados já traduzidos pelo ACL, ainda com códigos do IBGE."""

    carga = models.ForeignKey(Carga, on_delete=models.CASCADE, related_name="staging")
    tabela = models.PositiveIntegerField()
    produto_codigo = models.CharField(max_length=20)
    produto_nome = models.CharField(max_length=200)
    indicador_codigo = models.CharField(max_length=20)
    unidade = models.CharField(max_length=100)
    municipio_codigo = models.CharField(max_length=7)
    municipio_nome = models.CharField(max_length=100)
    ano = models.PositiveSmallIntegerField()
    valor = models.DecimalField(max_digits=22, decimal_places=4, null=True)
    status_valor = models.CharField(max_length=12)

    class Meta:
        db_table = "staging_medicao"
