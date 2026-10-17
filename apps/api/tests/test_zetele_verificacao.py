from decimal import Decimal
from typing import Any

import pytest

from zetele.verificacao import limpar_links, normalizar, numeros_permitidos, verificar

URL = "/painel?segmento=agricultura&produto=soja-em-grao&indicador=quantidade-produzida&fim=2024"
DADOS: list[Any] = [
    {
        "ano_referencia": 2024,
        "itens": [
            {"municipio": "Ariquemes", "valor": Decimal("450"), "valor_formatado": "1.234.567",
             "percentual_formatado": "14,9"},
        ],
        "total_formatado": "8.123.456,5",
        "url_painel": URL,
    }
]


@pytest.mark.parametrize(
    ("token", "esperado"),
    [("1.234.567", "1234567"), ("14,9", "14.9"), ("14,90", "14.9"), ("2024", "2024"), ("0,5", "0.5")],
)
def test_normaliza_numeros_pt_br(token: str, esperado: str) -> None:
    assert normalizar(token) == esperado


def test_numeros_permitidos_vem_de_valores_e_de_textos() -> None:
    p = numeros_permitidos(DADOS)
    assert {"2024", "450", "1234567", "14.9", "8123456.5"} <= p


def aprova(texto: str, refs: tuple[str, ...] = ()) -> bool:
    return verificar(texto, dados=DADOS, referencias=refs, urls_ferramentas={URL}).aprovada


def test_aprova_numero_copiado_da_ferramenta() -> None:
    assert aprova("Em 2024, Ariquemes liderou com 1.234.567 toneladas (14,9% do estado).")


def test_reprova_numero_inventado_ou_arredondado() -> None:
    assert not aprova("Em 2024, Ariquemes produziu 999.999 toneladas.")
    assert not aprova("Rondônia produz cerca de 8,1 milhões de toneladas.")


def test_inteiro_pequeno_sem_porcentagem_e_aceito_mas_porcentagem_nao() -> None:
    assert aprova("Veja os 5 maiores municípios no Painel.")
    assert not aprova("A produção cresceu 7% no período.")


def test_numero_da_pergunta_ou_da_base_e_aceito() -> None:
    assert aprova("Entre 2015 e 2024 a série está no Painel.", refs=("de 2015 a 2024?",))
    assert aprova("Ligue (69) 3214-8371.", refs=("Telefone (69) 3214-8371",))


def test_numeros_dentro_de_links_nao_contam() -> None:
    assert aprova(f"Veja [o ranking]({URL}) e a [tabela](https://sidra.ibge.gov.br/Tabela/5457).")


def test_links_fora_da_lista_sao_removidos_e_contados() -> None:
    texto, removidos = limpar_links(
        "Veja [aqui](https://exemplo.com), [o Painel](/painel), [outro recorte](/painel?produto=milho) "
        "e https://golpe.example/x.",
        {URL},
    )
    assert texto == "Veja aqui, [o Painel](/painel), outro recorte e ."
    assert removidos == 3


def test_link_interno_com_query_so_se_identico_ao_da_ferramenta() -> None:
    texto, removidos = limpar_links(f"[ranking]({URL})", {URL})
    assert (texto, removidos) == (f"[ranking]({URL})", 0)


def test_link_externo_permitido_continua() -> None:
    texto, removidos = limpar_links("[IBGE](https://sidra.ibge.gov.br/Tabela/5457)", set())
    assert removidos == 0


@pytest.mark.parametrize("texto", ["The Painel shows data.", "Condom pode ser retirado na UBS."])
def test_reprova_palavras_em_ingles(texto: str) -> None:
    v = verificar(texto, dados=[], referencias=[], urls_ferramentas=set())
    assert not v.aprovada
    assert any("termo proibido" in m for m in v.motivos)


def test_palavra_portuguesa_que_contem_termo_ingles_passa() -> None:
    assert aprova("Ande pelo Painel: ele mostra o ranking com detalhes.")


def test_termos_bloqueados_configuraveis(settings: Any) -> None:
    settings.ZETELE_TERMOS_BLOQUEADOS = ["condomínio"]
    v = verificar("Condomínio pode ser retirado.", dados=[], referencias=[], urls_ferramentas=set())
    assert not v.aprovada


@pytest.mark.parametrize(
    "texto", ["Rondônia produz 8.1 milhões de toneladas.", "A produção cresceu 7.5% no ano."]
)
def test_reprova_decimal_com_ponto_no_padrao_ingles(texto: str) -> None:
    v = verificar(texto, dados=DADOS, referencias=(), urls_ferramentas={URL})
    assert not v.aprovada
    assert any(m.startswith("número sem fonte: ") for m in v.motivos)


def test_decimal_com_ponto_aceito_quando_esta_na_fonte() -> None:
    assert aprova("O índice foi 8.1 no ano.", refs=("índice 8,1",))


@pytest.mark.parametrize(
    "texto", ["[Painel](//golpe.example/painel)", "[Home](//golpe.example/)"]
)
def test_link_sem_esquema_para_outro_host_e_removido(texto: str) -> None:
    limpo, removidos = limpar_links(texto, set())
    assert removidos == 1
    assert "golpe" not in limpo


def test_link_markdown_com_titulo_e_removido() -> None:
    limpo, removidos = limpar_links('Veja [x](https://golpe.example "oficial").', set())
    assert (limpo, removidos) == ("Veja x.", 1)


def test_link_markdown_com_colchetes_no_texto_e_removido() -> None:
    limpo, removidos = limpar_links("Veja [a [b]](https://golpe.example).", set())
    assert (limpo, removidos) == ("Veja a [b].", 1)


def test_links_aprovados_continuam_intactos_sem_contagem_dupla() -> None:
    texto = (
        "Veja [IBGE](https://sidra.ibge.gov.br/Tabela/5457), "
        '[CNA](https://www.cnabrasil.org.br "site da CNA") e https://sidra.ibge.gov.br/Tabela/1612.'
    )
    assert limpar_links(texto, set()) == (texto, 0)


def test_whatsapp_so_o_oficial() -> None:
    oficial = "[WhatsApp](https://wa.me/556932247620)"
    assert limpar_links(oficial, set()) == (oficial, 0)
    limpo, removidos = limpar_links("Chame no [WhatsApp](https://wa.me/5569999991234).", set())
    assert (limpo, removidos) == ("Chame no WhatsApp.", 1)
    limpo, removidos = limpar_links("Ou https://wa.me/5569999991234 direto.", set())
    assert (limpo, removidos) == ("Ou  direto.", 1)


def test_whatsapp_devolvido_pela_ferramenta_passa() -> None:
    url = "https://wa.me/556932247620?text=Ol%C3%A1"
    assert limpar_links(f"[fale]({url})", {url}) == (f"[fale]({url})", 0)


def test_url_malformada_e_removida_sem_derrubar_a_verificacao() -> None:
    limpo, removidos = limpar_links("Veja [x](https://[golpe) e https://[golpe2 aqui.", set())
    assert (limpo, removidos) == ("Veja x e  aqui.", 2)
