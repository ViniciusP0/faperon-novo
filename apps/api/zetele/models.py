from django.db import models
from django.utils import timezone


class Pergunta(models.Model):
    """Pergunta feita ao Zétele, anônima: sem IP, sem resposta, sem id de conversa (ADR 0030)."""

    class Status(models.TextChoices):
        RESPONDIDA = "respondida", "Respondida"
        RECUSADA = "recusada", "Recusada"
        VERIFICACAO_FALHOU = "verificacao_falhou", "Verificação falhou"
        ERRO = "erro", "Erro"
        INDISPONIVEL = "indisponivel", "Indisponível"

    texto = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=Status.choices)
    pagina = models.CharField(max_length=64)
    criada_em = models.DateTimeField(default=timezone.now, db_index=True)
    tokens_entrada = models.PositiveIntegerField(default=0)
    tokens_saida = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "zetele_pergunta"
        ordering = ["-criada_em"]
