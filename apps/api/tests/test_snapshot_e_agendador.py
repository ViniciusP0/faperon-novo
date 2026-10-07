from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from django.core.management import call_command
from django.utils import timezone as tz

from indicadores.models import Indicador, Medicao, Municipio, Produto, ProdutoIndicador
from ingestao import agendador, snapshot
from ingestao.management.commands.run_scheduler import rodar_ciclo
from ingestao.models import Carga
from ingestao.servico import executar_carga
from tests.conftest import ClienteFalso

UTC = UTC
AGORA = datetime(2026, 9, 24, 12, 0, tzinfo=UTC)


@pytest.mark.parametrize(
    ("concluida", "tentativa", "esperado"),
    [
        (None, None, True),  # nunca rodou
        (AGORA - timedelta(days=2, hours=23), None, False),
        (AGORA - timedelta(days=3), None, True),
        (AGORA - timedelta(days=10), AGORA - timedelta(hours=1), False),  # falhou há pouco
        (AGORA - timedelta(days=10), AGORA - timedelta(hours=7), True),
        (None, AGORA - timedelta(minutes=5), False),
    ],
)
def test_regra_do_agendador(
    concluida: datetime | None, tentativa: datetime | None, esperado: bool
) -> None:
    assert agendador.precisa_ingerir(AGORA, concluida, tentativa) is esperado


@pytest.mark.django_db
def test_ciclo_roda_tabelas_vencidas_e_pula_as_recentes(cliente_soja: ClienteFalso) -> None:
    antiga = tz.now() - timedelta(days=5)
    Carga.objects.create(
        tabela=74, iniciada_em=antiga, concluida_em=antiga, status=Carga.Status.SUCESSO, hash="x"
    )
    recente = tz.now() - timedelta(hours=1)
    Carga.objects.create(
        tabela=3939,
        iniciada_em=recente,
        concluida_em=recente,
        status=Carga.Status.SUCESSO,
        hash="y",
    )
    tentadas = rodar_ciclo(cliente_soja)  # type: ignore[arg-type]
    assert tentadas == 3  # 74 (vencida), 94 e 5457 (nunca rodaram); 3939 é recente
    assert set(Carga.objects.filter(iniciada_em__gt=recente).values_list("tabela", flat=True)) == {
        74,
        94,
        5457,
    }


@pytest.mark.django_db
def test_ciclo_registra_falha_sem_derrubar_o_agendador() -> None:
    quebrado = ClienteFalso([("1", "X")], {"1": RuntimeError("IBGE fora")})
    assert rodar_ciclo(quebrado) == 4  # type: ignore[arg-type]
    assert Carga.objects.filter(status=Carga.Status.FALHA).count() == 4
    assert rodar_ciclo(quebrado) == 0  # aguarda 6 h antes de tentar de novo


@pytest.mark.django_db
def test_snapshot_gera_e_restaura_em_banco_vazio(
    cliente_soja: ClienteFalso, tmp_path: Path
) -> None:
    executar_carga(5457, cliente_soja)
    destino = tmp_path / "seed.json.gz"
    contagem = snapshot.gerar(destino)
    assert contagem["medicoes"] == Medicao.objects.count() > 0
    bytes1 = destino.read_bytes()
    snapshot.gerar(tmp_path / "outra.json.gz")
    assert (tmp_path / "outra.json.gz").read_bytes() == bytes1  # determinístico, bom para git

    estado = list(
        Medicao.objects.order_by("id").values_list("produto_id", "municipio_id", "ano", "valor")
    )
    Medicao.objects.all().delete()
    ProdutoIndicador.objects.all().delete()
    Produto.objects.all().delete()
    Indicador.objects.all().delete()
    Municipio.objects.all().delete()
    Carga.objects.all().delete()

    restaurado = snapshot.restaurar(destino)
    assert restaurado["medicoes"] == contagem["medicoes"]
    assert (
        list(
            Medicao.objects.order_by("id").values_list("produto_id", "municipio_id", "ano", "valor")
        )
        == estado
    )
    assert Carga.objects.get().status == Carga.Status.SUCESSO
    # sequências reajustadas: novo produto não colide com ids restaurados
    Produto.objects.create(
        slug="novo", codigo_ibge="1", nome="Novo", segmento="agricultura", tabela_origem=5457
    )


@pytest.mark.django_db
def test_restaurar_recusa_banco_com_dados_sem_forcar(
    cliente_soja: ClienteFalso, tmp_path: Path
) -> None:
    executar_carga(5457, cliente_soja)
    destino = tmp_path / "seed.json.gz"
    snapshot.gerar(destino)
    with pytest.raises(ValueError, match="já tem medições"):
        snapshot.restaurar(destino)
    snapshot.restaurar(destino, forcar=True)
    assert Produto.objects.count() == 1


@pytest.mark.django_db
def test_comandos_snapshot_e_seed(
    cliente_soja: ClienteFalso, tmp_path: Path, settings: object
) -> None:
    settings.SEED_DIR = tmp_path  # type: ignore[attr-defined]
    executar_carga(5457, cliente_soja)
    call_command("snapshot")
    assert (tmp_path / snapshot.ARQUIVO).exists()
    call_command("seed", "--if-empty")  # já há dados: ignora
    call_command("seed", "--force")
    assert Medicao.objects.exists()


@pytest.mark.django_db
def test_seed_sem_arquivo(tmp_path: Path, settings: object) -> None:
    settings.SEED_DIR = tmp_path  # type: ignore[attr-defined]
    call_command("seed", "--if-empty")  # não falha
    from django.core.management.base import CommandError

    with pytest.raises(CommandError):
        call_command("seed")
