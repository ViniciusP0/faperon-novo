from django.db import models


class Relatorio(models.Model):
    """PDF gerado, guardado por recorte + versão dos dados (mesmo recorte = mesmo PDF)."""

    chave = models.CharField(max_length=64, unique=True)
    nome_arquivo = models.CharField(max_length=200)
    pdf = models.BinaryField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "relatorio"
