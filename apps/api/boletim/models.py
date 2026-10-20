from django.db import models


class Fonte(models.TextChoices):
    DOU = "dou", "Diário Oficial da União"
    DOE = "doe", "Diário Oficial de Rondônia"


class Ato(models.Model):
    """Ato coletado de um diário oficial, com o resultado da triagem."""

    fonte = models.CharField(max_length=3, choices=Fonte.choices)
    id_externo = models.CharField(max_length=200)
    dia = models.DateField()
    edicao = models.CharField(max_length=50, blank=True, default="")
    secao = models.CharField(max_length=100, blank=True, default="")
    orgao = models.CharField(max_length=300, blank=True, default="")
    titulo = models.TextField()
    texto = models.TextField(blank=True, default="")
    url = models.URLField(max_length=500, blank=True, default="")
    pagina = models.PositiveIntegerField(null=True, blank=True)
    relevante = models.BooleanField(null=True, blank=True)
    pontuacao = models.PositiveSmallIntegerField(default=0)
    rondonia = models.BooleanField(default=False)
    titulo_chave = models.CharField(max_length=300, blank=True, default="")
    resumo = models.TextField(blank=True, default="")
    destaque = models.BooleanField(default=False)
    coletado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "boletim_ato"
        ordering = ["-dia", "-pontuacao", "id"]
        constraints = [
            models.UniqueConstraint(fields=["fonte", "id_externo"], name="boletim_ato_unico")
        ]
        indexes = [
            models.Index(fields=["dia"], name="boletim_ato_dia_idx"),
            models.Index(fields=["fonte", "dia"], name="boletim_ato_fonte_dia_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.fonte} {self.id_externo} ({self.dia})"


class Coleta(models.Model):
    """Situação da coleta de uma fonte em um dia."""

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        OK = "ok", "Ok"
        FALHA = "falha", "Falha"

    fonte = models.CharField(max_length=3, choices=Fonte.choices)
    dia = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDENTE)
    lidos = models.PositiveIntegerField(default=0)
    erro = models.TextField(blank=True, default="")
    tentativas = models.PositiveSmallIntegerField(default=0)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "boletim_coleta"
        ordering = ["-dia", "fonte"]
        constraints = [
            models.UniqueConstraint(fields=["fonte", "dia"], name="boletim_coleta_unica")
        ]

    def __str__(self) -> str:
        return f"{self.fonte} {self.dia} ({self.status})"


class ConsumoDia(models.Model):
    """Consumo diário do modelo na triagem (teto de custo)."""

    dia = models.DateField(unique=True)
    chamadas = models.PositiveIntegerField(default=0)
    tokens_entrada = models.PositiveBigIntegerField(default=0)
    tokens_saida = models.PositiveBigIntegerField(default=0)

    class Meta:
        db_table = "boletim_consumo_dia"
        ordering = ["-dia"]

    def __str__(self) -> str:
        return f"Consumo {self.dia}"
