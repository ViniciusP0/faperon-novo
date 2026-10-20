"""Leitura do boletim: monta as respostas da API a partir dos atos já triados."""

from datetime import date, timedelta
from typing import Any

from django.conf import settings
from django.db.models import Count, Q, QuerySet
from django.utils import timezone

from boletim.models import Ato, Coleta, Fonte
from indicadores.erros import NaoEncontrado

LIMITE_NOTAS = 10
LIMITE_ERRO = 300
ORIGENS = {"todas": None, "estado": Fonte.DOE, "uniao": Fonte.DOU}
_ROTULO_DIARIO = {Fonte.DOE.value: "DOE-RO", Fonte.DOU.value: "DOU"}
_ORDEM = ("-rondonia", "-pontuacao", "-coletado_em", "-id")


def hoje() -> date:
    """Dia corrente no fuso do projeto (America/Porto_Velho)."""
    return timezone.localdate()


def janela(hoje_: date) -> list[date]:
    """Datas expostas, da mais nova à mais antiga: hoje e a retenção de dias anteriores.

    É exatamente o que `boletim.coleta.expurgar` preserva.
    """
    return [hoje_ - timedelta(days=i) for i in range(settings.BOLETIM_RETENCAO_DIAS + 1)]


def listar_dias(hoje: date) -> list[dict[str, Any]]:
    """Uma entrada por data da janela, com total de notas relevantes e situação da coleta."""
    datas = janela(hoje)
    resumo = {
        linha["dia"]: linha
        for linha in Ato.objects.filter(relevante=True, dia__in=datas)
        .order_by()
        .values("dia")
        .annotate(total=Count("id"), destaques=Count("id", filter=Q(destaque=True)))
    }
    status: dict[date, dict[str, str]] = {}
    for coleta in Coleta.objects.filter(dia__in=datas):
        status.setdefault(coleta.dia, {})[coleta.fonte] = coleta.status
    dias = []
    for d in datas:
        linha = resumo.get(d)
        dias.append(
            {
                "dia": d.isoformat(),
                "total": linha["total"] if linha else 0,
                "tem_destaque": bool(linha and linha["destaques"]),
                "fontes": {f.value: status.get(d, {}).get(f.value, "sem_coleta") for f in Fonte},
            }
        )
    return dias


def _nota(ato: Ato) -> dict[str, Any]:
    rotulo = _ROTULO_DIARIO[ato.fonte]
    return {
        "id": ato.pk,
        "origem": "estado" if ato.fonte == Fonte.DOE else "uniao",
        "diario": f"{rotulo} nº {ato.edicao}" if ato.edicao else rotulo,
        "orgao": ato.orgao,
        "titulo": ato.titulo_chave,
        "resumo": ato.resumo,
        "rondonia": ato.rondonia,
        "data": ato.dia.isoformat(),
        "url": ato.url,
    }


def _fontes(dia: date) -> dict[str, dict[str, str]]:
    por_fonte = {c.fonte: c for c in Coleta.objects.filter(dia=dia)}
    saida = {}
    for f in Fonte:
        c = por_fonte.get(f.value)
        saida[f.value] = {
            "status": c.status if c else "sem_coleta",
            "erro": (c.erro if c else "")[:LIMITE_ERRO],
        }
    return saida


def montar_dia(dia: date, origem: str, todas: bool, hoje: date) -> dict[str, Any]:
    """Destaque e notas de um dia; fora da janela levanta `NaoEncontrado`."""
    if dia not in janela(hoje):
        raise NaoEncontrado("Dia fora da janela do boletim")
    qs: QuerySet[Ato] = Ato.objects.filter(relevante=True, dia=dia)
    fonte = ORIGENS[origem]
    if fonte is not None:
        qs = qs.filter(fonte=fonte)
    qs = qs.order_by(*_ORDEM)
    destaque = qs.filter(destaque=True).first() or qs.first()
    restantes = qs.exclude(pk=destaque.pk) if destaque else qs.none()
    if not todas:
        restantes = restantes[:LIMITE_NOTAS]
    return {
        "dia": dia.isoformat(),
        "destaque": _nota(destaque) if destaque else None,
        "notas": [_nota(a) for a in restantes],
        "total": qs.count(),
        "fontes": _fontes(dia),
    }
