import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from indicadores.aplicacao import atualizar_views, garantir_indicadores
from indicadores.models import Indicador, Medicao, Municipio, Produto, ProdutoIndicador
from ingestao.models import Carga

FIXTURES = Path(__file__).parent / "fixtures"


def carregar_fixture(nome: str) -> Any:
    return json.loads((FIXTURES / nome).read_text(encoding="utf-8"))


class ClienteFalso:
    """Substitui o SidraCliente: devolve respostas gravadas, sem rede."""

    def __init__(
        self,
        categorias: list[tuple[str, str]],
        respostas: dict[str, Any],
        serie: Any = None,
    ) -> None:
        self._serie = serie
        self._categorias = categorias
        self._respostas = respostas
        self.chamadas = 0

    def categorias(self, tabela: int, classificacao: int) -> list[tuple[str, str]]:
        return self._categorias

    def serie_nacional(self, tabela: int, variavel: str) -> Any:
        if isinstance(self._serie, Exception):
            raise self._serie
        return self._serie

    def dados(
        self, tabela: int, variaveis: tuple[str, ...], classificacao: int | None, categoria: str
    ) -> Any:
        self.chamadas += 1
        resposta = self._respostas[categoria]
        if isinstance(resposta, Exception):
            raise resposta
        return resposta


@pytest.fixture(autouse=True)
def seed_isolado(settings: Any, tmp_path: Path) -> None:
    """Testes nunca leem nem gravam o data/seed/ real do repositório."""
    settings.SEED_DIR = tmp_path / "seed"


@pytest.fixture
def cliente_soja() -> ClienteFalso:
    """Resposta real da tabela 5457: soja, quantidade produzida, 2023 e 2024."""
    resposta = carregar_fixture("sidra_5457_soja_quantidade_2023_2024.json")
    return ClienteFalso(
        [("0", "Total"), ("40124", "Soja (em grão)")],
        {"40124": resposta},
        carregar_fixture("sidra_1737_ipca_2024_2025.json"),
    )


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def carga(db: None) -> Carga:
    agora = timezone.now()
    return Carga.objects.create(
        tabela=5457, iniciada_em=agora, concluida_em=agora, status=Carga.Status.SUCESSO, linhas=1
    )


@pytest.fixture
def municipios(db: None) -> list[Municipio]:
    return [
        Municipio.objects.create(codigo_ibge="1100015", nome="Alta Floresta D'Oeste"),
        Municipio.objects.create(codigo_ibge="1100023", nome="Ariquemes"),
        Municipio.objects.create(codigo_ibge="1100031", nome="Cabixi"),
        Municipio.objects.create(codigo_ibge="1100049", nome="Cacoal"),
    ]


@pytest.fixture
def soja(db: None) -> Produto:
    garantir_indicadores()
    produto = Produto.objects.create(
        slug="soja-em-grao",
        codigo_ibge="40124",
        nome="Soja (em grão)",
        segmento="agricultura",
        tabela_origem=5457,
    )
    for slug, unidade in [
        ("quantidade-produzida", "Toneladas"),
        ("area-colhida", "Hectares"),
        ("rendimento-medio", "Quilogramas por Hectare"),
    ]:
        ProdutoIndicador.objects.create(
            produto=produto, indicador=Indicador.objects.get(slug=slug), unidade=unidade
        )
    return produto


def lancar(
    produto: Produto,
    indicador: str,
    municipio: str,
    ano: int,
    valor: str | int | None,
    carga: Carga,
    status: str = "ok",
) -> None:
    Medicao.objects.create(
        produto=produto,
        indicador=Indicador.objects.get(slug=indicador),
        municipio_id=municipio,
        ano=ano,
        valor=None if valor is None else Decimal(str(valor)),
        status_valor=status,
        carga=carga,
    )


@pytest.fixture
def dados_soja(soja: Produto, municipios: list[Municipio], carga: Carga) -> Produto:
    """Soja com 4 municípios: Cabixi sigiloso em 2024, Cacoal sem dado (inexistente)."""
    q = "quantidade-produzida"
    for ano, valores in {
        2022: (100, 300, 50),
        2023: (120, 330, 60),
        2024: (150, 450, None),
    }.items():
        for codigo, valor in zip(("1100015", "1100023", "1100031"), valores, strict=True):
            if valor is None:
                lancar(soja, q, codigo, ano, None, carga, "sigiloso")
            else:
                lancar(soja, q, codigo, ano, valor, carga)
    # rendimento e área colhida para a média ponderada (2024)
    lancar(soja, "area-colhida", "1100015", 2024, 50, carga)
    lancar(soja, "area-colhida", "1100023", 2024, 150, carga)
    lancar(soja, "rendimento-medio", "1100015", 2024, 2000, carga)
    lancar(soja, "rendimento-medio", "1100023", 2024, 4000, carga)
    atualizar_views()
    return soja


@pytest.fixture(autouse=True)
def cache_limpo() -> None:
    """O throttle por IP vive no cache em arquivo; sem limpar, vaza entre testes."""
    from django.core.cache import cache

    cache.clear()
