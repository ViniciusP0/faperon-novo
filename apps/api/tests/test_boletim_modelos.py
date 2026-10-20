from datetime import date

import pytest
from django.conf import settings
from django.db import IntegrityError, transaction

from boletim.models import Ato


def _ato(**extra) -> Ato:
    dados = {
        "fonte": "doe",
        "id_externo": "123",
        "dia": date(2026, 10, 20),
        "edicao": "200",
        "secao": "1",
        "orgao": "SEAGRI",
        "titulo": "Portaria",
        "texto": "Texto do ato",
        "url": "https://exemplo.test/ato/123",
    }
    dados.update(extra)
    return Ato(**dados)


@pytest.mark.django_db
def test_ato_unico_por_fonte_e_id() -> None:
    _ato().save()
    with pytest.raises(IntegrityError), transaction.atomic():
        _ato().save()
    _ato(fonte="dou").save()


def test_ajustes_padrao() -> None:
    assert settings.BOLETIM_ATIVO is False
    assert settings.BOLETIM_MODELO == settings.ZETELE_MODELO
    assert settings.BOLETIM_RETENCAO_DIAS == 7
    assert settings.BOLETIM_VALOR_MINIMO == 500000
