import ssl

import pytest
import requests

from ingestao.tls import INTERMEDIARIO_IBGE, sessao_ibge


def test_intermediario_empacotado_e_um_certificado_valido():
    pem = INTERMEDIARIO_IBGE.read_text(encoding="ascii")
    assert pem.startswith("-----BEGIN CERTIFICATE-----")
    assert ssl.PEM_cert_to_DER_cert(pem)


def test_sessao_ibge_usa_o_adaptador_so_para_o_host_do_ibge():
    sessao = sessao_ibge()
    assert type(sessao.get_adapter("https://servicodados.ibge.gov.br/api")).__name__ == (
        "_AdaptadorCadeiaIbge"
    )
    assert type(sessao.get_adapter("https://example.com/")) is requests.adapters.HTTPAdapter


@pytest.mark.network
def test_conecta_ao_ibge_com_verificacao_ligada():
    resposta = sessao_ibge().get(
        "https://servicodados.ibge.gov.br/api/v3/agregados/94/metadados", timeout=30
    )
    assert resposta.status_code == 200
