import csv
import io
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from django.core.management import call_command
from django.utils import timezone

from zetele.expurgo import expurgar_perguntas, limite_expurgo
from zetele.models import Pergunta
from zetele.registro import mascarar, registrar


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("meu cpf é 123.456.789-09", "meu cpf é [removido]"),
        ("cnpj 12.345.678/0001-90 da fazenda", "cnpj [removido] da fazenda"),
        ("email joao.silva@exemplo.com.br ok", "email [removido] ok"),
        ("ligue (69) 99999-1234", "ligue [removido]"),
        ("protocolo 123456789", "protocolo [removido]"),
        ("soja entre 2014 e 2024", "soja entre 2014 e 2024"),
        ("quanto produz Vilhena?", "quanto produz Vilhena?"),
    ],
)
def test_mascara_dados_pessoais_e_preserva_o_resto(entrada: str, esperado: str) -> None:
    assert mascarar(entrada) == esperado


@pytest.mark.django_db
def test_registra_texto_mascarado_sem_identificar_ninguem() -> None:
    registrar("meu email é a@b.com, qual o maior produtor?", "respondida", "/painel", 120, 40)
    p = Pergunta.objects.get()
    assert p.texto == "meu email é [removido], qual o maior produtor?"
    assert (p.status, p.pagina, p.tokens_entrada, p.tokens_saida) == ("respondida", "/painel", 120, 40)
    campos = {f.name for f in Pergunta._meta.get_fields()}
    assert campos.isdisjoint({"ip", "user_agent", "resposta", "conversa"})


def test_limite_do_expurgo_e_90_dias() -> None:
    agora = datetime(2026, 10, 17, 12, tzinfo=UTC)
    assert limite_expurgo(agora) == datetime(2026, 7, 19, 12, tzinfo=UTC)


@pytest.mark.django_db
def test_expurgo_apaga_so_as_antigas() -> None:
    agora = timezone.now()
    velha = Pergunta.objects.create(texto="a", status="respondida", pagina="/", criada_em=agora - timedelta(days=91))
    nova = Pergunta.objects.create(texto="b", status="respondida", pagina="/", criada_em=agora - timedelta(days=89))
    assert expurgar_perguntas(agora) == 1
    assert not Pergunta.objects.filter(pk=velha.pk).exists()
    assert Pergunta.objects.filter(pk=nova.pk).exists()


@pytest.mark.django_db
def test_scheduler_expurga_em_toda_passada(monkeypatch: pytest.MonkeyPatch) -> None:
    from ingestao.management.commands import run_scheduler

    monkeypatch.setattr(run_scheduler, "precisa_ingerir", lambda *a: False)
    Pergunta.objects.create(texto="a", status="respondida", pagina="/", criada_em=timezone.now() - timedelta(days=120))
    run_scheduler.rodar_ciclo(None)  # type: ignore[arg-type]
    assert Pergunta.objects.count() == 0


@pytest.mark.django_db
def test_falha_no_expurgo_nao_derruba_o_scheduler(monkeypatch: pytest.MonkeyPatch) -> None:
    from ingestao.management.commands import run_scheduler

    def explode(*a: Any) -> int:
        raise RuntimeError("banco fora")

    monkeypatch.setattr(run_scheduler, "precisa_ingerir", lambda *a: False)
    monkeypatch.setattr(run_scheduler, "expurgar_perguntas", explode)
    assert run_scheduler.rodar_ciclo(None) == 0  # type: ignore[arg-type]


@pytest.mark.django_db
def test_exportar_gera_csv_das_perguntas_recentes() -> None:
    agora = timezone.now()
    Pergunta.objects.create(texto="onde fica o painel?", status="respondida", pagina="/", criada_em=agora)
    Pergunta.objects.create(texto="antiga", status="recusada", pagina="/", criada_em=agora - timedelta(days=40))
    saida = io.StringIO()
    call_command("zetele_exportar", "--dias", "30", stdout=saida)
    linhas = list(csv.reader(io.StringIO(saida.getvalue())))
    assert linhas[0] == ["texto", "status", "pagina", "criada_em"]
    assert [linha[0] for linha in linhas[1:]] == ["onde fica o painel?"]
