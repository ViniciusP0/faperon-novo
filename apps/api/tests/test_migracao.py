import pytest
from django.core.management import call_command
from django.db import connection


@pytest.mark.django_db
def test_migracoes_do_zero_criam_a_view_materializada() -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT matviewname FROM pg_matviews WHERE matviewname = 'mv_ranking'")
        assert cursor.fetchone() == ("mv_ranking",)
        cursor.execute("SELECT count(*) FROM mv_ranking")
        assert cursor.fetchone() == (0,)


@pytest.mark.django_db
def test_modelos_sem_migracao_pendente() -> None:
    call_command("makemigrations", "--check", "--dry-run")


@pytest.mark.django_db
def test_constraint_impede_ok_sem_valor(dados_soja: object) -> None:
    from django.db import IntegrityError, transaction

    from indicadores.models import Medicao

    m = Medicao.objects.first()
    assert m is not None
    m.valor = None
    m.status_valor = "ok"
    with pytest.raises(IntegrityError), transaction.atomic():
        m.save()
    with pytest.raises(IntegrityError), transaction.atomic():
        Medicao.objects.filter(pk=m.pk).update(status_valor="sigiloso", valor=5)
