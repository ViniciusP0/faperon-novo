from typing import Any

from django.db import connection
from django.db.models import Max, Min
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from indicadores import servicos
from indicadores.api import apresentacao as ap
from indicadores.api import destaques
from indicadores.api import serializers as sz
from indicadores.api.parametros import lista_csv, validar_consulta
from indicadores.erros import ConsultaInvalida
from indicadores.models import Medicao, Municipio
from indicadores.servicos import Recorte
from ingestao.models import Carga

ERROS = {
    400: OpenApiResponse(sz.ErroSerializer, description="Parâmetro inválido"),
    404: OpenApiResponse(sz.ErroSerializer, description="Recurso inexistente"),
    422: OpenApiResponse(sz.ErroSerializer, description="Combinação inválida"),
}


def resolver_consulta(dados: dict[str, Any]) -> tuple[Recorte, int, int]:
    recorte = servicos.obter_recorte(dados["produto"], dados["indicador"])
    inicio, fim = servicos.resolver_periodo(recorte, dados.get("inicio"), dados.get("fim"))
    return recorte, inicio, fim


class ProdutosView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaProdutosSerializer],
        responses={200: sz.ProdutoSerializer(many=True), **ERROS},
    )
    def get(self, request: Request) -> Response:
        dados = validar_consulta(sz.ConsultaProdutosSerializer, request)
        produtos = servicos.listar_produtos(dados.get("segmento"), dados.get("q"))
        corpo = [
            {
                "slug": p.slug,
                "nome": p.nome,
                "segmento": p.segmento,
                "tabela_sidra": p.tabela_origem,
            }
            for p in produtos
        ]
        return Response(sz.ProdutoSerializer(corpo, many=True).data)


class IndicadoresView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaIndicadoresSerializer],
        responses={200: sz.IndicadorSerializer(many=True), **ERROS},
    )
    def get(self, request: Request) -> Response:
        dados = validar_consulta(sz.ConsultaIndicadoresSerializer, request)
        produto = servicos.obter_produto(dados["produto"])
        corpo = [
            {
                "slug": v.indicador.slug,
                "nome": v.indicador.nome,
                "unidade": v.unidade,
                "agregacao": v.indicador.agregacao,
            }
            for v in servicos.listar_indicadores(produto)
        ]
        return Response(sz.IndicadorSerializer(corpo, many=True).data)


class MunicipiosView(APIView):
    @extend_schema(responses={200: sz.MunicipioSerializer(many=True)})
    def get(self, request: Request) -> Response:
        corpo = [{"codigo_ibge": m.codigo_ibge, "nome": m.nome} for m in Municipio.objects.all()]
        return Response(sz.MunicipioSerializer(corpo, many=True).data)


class MetaView(APIView):
    @extend_schema(responses={200: sz.MetaGeralSerializer})
    def get(self, request: Request) -> Response:
        cargas = []
        ultima = None
        # Uma consulta só: a carga mais recente de cada tabela (DISTINCT ON), em vez de uma consulta por tabela.
        recentes = (
            Carga.objects.filter(status__in=[Carga.Status.SUCESSO, Carga.Status.INALTERADA])
            .order_by("tabela", "-concluida_em")
            .distinct("tabela")
        )
        for carga in recentes:
            tabela = carga.tabela
            if carga.concluida_em and (ultima is None or carga.concluida_em > ultima):
                ultima = carga.concluida_em
            cargas.append(
                {
                    "tabela": tabela,
                    "status": carga.status,
                    "concluida_em": servicos.formatar_data(carga.concluida_em),
                    "linhas": carga.linhas,
                }
            )
        limites = Medicao.objects.filter(status_valor="ok").aggregate(
            minimo=Min("ano"), maximo=Max("ano")
        )
        corpo = {
            "ultima_carga": servicos.formatar_data(ultima),
            "cargas": cargas,
            "anos": {"min": limites["minimo"], "max": limites["maximo"]},
        }
        return Response(sz.MetaGeralSerializer(corpo).data)


class RankingView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaSerializer],
        responses={200: sz.RankingSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        recorte, inicio, fim = resolver_consulta(validar_consulta(sz.ConsultaSerializer, request))
        resultado = servicos.ranking(recorte, inicio, fim)
        itens = [
            {
                "posicao": i.posicao,
                "municipio": {"codigo_ibge": i.codigo_ibge, "nome": i.nome},
                "valor": i.valor,
                "status": i.status,
                "percentual_total": ap.arredondar(i.percentual_total),
            }
            for i in resultado["itens"]
        ]
        corpo = {
            "produto": ap.ref_produto(recorte.produto),
            "indicador": ap.ref_indicador(recorte),
            "inicio": inicio,
            "fim": fim,
            "ano_referencia": resultado["ano_referencia"],
            "total_estadual": resultado["total_estadual"],
            "itens": itens,
            "meta": ap.meta(recorte.produto.tabela_origem),
        }
        return Response(sz.RankingSerializer(corpo).data)


class SerieView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaSerieSerializer],
        responses={200: sz.SerieSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        dados = validar_consulta(sz.ConsultaSerieSerializer, request)
        recorte, inicio, fim = resolver_consulta(dados)
        municipio = servicos.obter_municipio(dados["municipio"]) if dados.get("municipio") else None
        corpo = {
            "produto": ap.ref_produto(recorte.produto),
            "indicador": ap.ref_indicador(recorte),
            "municipio": ap.ref_municipio(municipio),
            "inicio": inicio,
            "fim": fim,
            "pontos": ap.pontos(servicos.serie(recorte, inicio, fim, municipio)),
            "meta": ap.meta(recorte.produto.tabela_origem),
        }
        return Response(sz.SerieSerializer(corpo).data)


class ComparacaoView(APIView):
    @extend_schema(
        parameters=[sz.ConsultaComparacaoSerializer],
        responses={200: sz.ComparacaoSerializer, **ERROS},
    )
    def get(self, request: Request) -> Response:
        dados = validar_consulta(sz.ConsultaComparacaoSerializer, request)
        codigos = lista_csv(dados.get("municipios"))
        slugs = lista_csv(dados.get("produtos"))
        if bool(codigos) == bool(slugs):
            raise ConsultaInvalida(
                "Informe 'municipios' (com 'produto') ou 'produtos', mas não os dois",
                {"municipios": "use municipios ou produtos"},
            )
        if slugs:
            return Response(self._por_produtos(dados, slugs))
        if not dados.get("produto"):
            raise ConsultaInvalida("Informe 'produto'", {"produto": "obrigatório"})
        return Response(self._por_municipios(dados, codigos))

    def _por_municipios(self, dados: dict[str, Any], codigos: list[str]) -> dict[str, Any]:
        recorte, inicio, fim = resolver_consulta(dados)
        series = servicos.comparacao_municipios(recorte, inicio, fim, codigos)
        return self._corpo("municipios", recorte, recorte.unidade, inicio, fim, series)

    def _por_produtos(self, dados: dict[str, Any], slugs: list[str]) -> dict[str, Any]:
        recortes = [servicos.obter_recorte(s, dados["indicador"]) for s in slugs]
        periodos = [
            servicos.resolver_periodo(r, dados.get("inicio"), dados.get("fim")) for r in recortes
        ]
        fim = dados.get("fim") or max(p[1] for p in periodos)
        inicio = dados.get("inicio") or fim - (servicos.JANELA_PADRAO - 1)
        municipio = servicos.obter_municipio(dados["municipio"]) if dados.get("municipio") else None
        series = servicos.comparacao_produtos(recortes, inicio, fim, municipio)
        return self._corpo("produtos", recortes[0], recortes[0].unidade, inicio, fim, series)

    @staticmethod
    def _corpo(
        modo: str,
        recorte: Recorte,
        unidade: str,
        inicio: int,
        fim: int,
        series: list[servicos.SerieNomeada],
    ) -> dict[str, Any]:
        corpo = {
            "modo": modo,
            "indicador": ap.ref_indicador(recorte),
            "unidade": unidade,
            "inicio": inicio,
            "fim": fim,
            "anos": list(range(inicio, fim + 1)),
            "series": [{"id": s.id, "nome": s.nome, "pontos": ap.pontos(s.pontos)} for s in series],
            "meta": ap.meta(recorte.produto.tabela_origem),
        }
        return dict(sz.ComparacaoSerializer(corpo).data)


class DestaquesView(APIView):
    @extend_schema(responses={200: sz.DestaquesSerializer})
    def get(self, request: Request) -> Response:
        return Response(sz.DestaquesSerializer(destaques.montar_destaques()).data)


class SaudeView(APIView):
    @extend_schema(responses={200: sz.SaudeSerializer})
    def get(self, request: Request) -> Response:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok", "banco": "ok"})
