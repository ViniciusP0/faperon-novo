from django.db import models
from django.utils import timezone


class PerguntaBase(models.Model):
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
        abstract = True
        ordering = ["-criada_em"]


class Pergunta(PerguntaBase):
    """Zétele do site público."""

    class Meta(PerguntaBase.Meta):
        db_table = "zetele_pergunta"


class PerguntaSistema(PerguntaBase):
    """Zétele da área do sistema: tabela própria, separada do público (ADR 0032)."""

    class Meta(PerguntaBase.Meta):
        db_table = "zetele_pergunta_sistema"


class ContagemDiaria(models.Model):
    """Chamadas ao modelo por canal e dia (teto diário, ADR 0032). No banco e com incremento atômico:
    no cache de arquivo o incr regravava sem prazo (a chave expirava em 5 min) e podia ser despejado."""

    canal = models.CharField(max_length=16)
    dia = models.DateField()
    total = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "zetele_contagem_diaria"
        constraints = [
            models.UniqueConstraint(fields=["canal", "dia"], name="zetele_contagem_canal_dia")
        ]
