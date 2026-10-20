"""Coleta diária do boletim: baixa, tria, classifica, grava, escolhe o destaque e expurga."""

import logging
from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import date, timedelta
from typing import Literal

from django.conf import settings
from django.db.models import F

from boletim.classificador import TAMANHO_LOTE, Uso, classificar
from boletim.fontes import FonteIndisponivel
from boletim.fontes.doe import baixar_edicao, dividir_edicao, url_pdf
from boletim.fontes.dou import baixar_dou, baixar_texto_nota
from boletim.models import Ato, Coleta, ConsumoDia
from boletim.tipos import AtoBruto, Veredito
from boletim.triagem import precisa_texto_completo, triar
from zetele.cliente import ClienteLLM, PedidoRecusado, ProvedorIndisponivel, TempoEsgotado

log = logging.getLogger(__name__)

SECOES_DOU = ("do1", "do3")  # a seção 2 (pessoal) nunca é lida
# Edição comum primeiro; as demais são extras e opcionais (404 é normal).
SUFIXOS_DOE_EXTRAS = ("EXTRAORDINARIO-", "-SUPLEMENTAR-1", "-SUPLEMENTAR-2")
MAX_TEXTOS_COMPLETOS = 150  # teto de notas baixadas por rodada, para não martelar o in.gov.br
MAX_ERRO = 500

_ERROS_PROVEDOR = (ProvedorIndisponivel, TempoEsgotado, PedidoRecusado)


@dataclass(frozen=True)
class Fontes:
    """Funções de download agrupadas, para os testes trocarem por falsas."""

    dou: Callable[[date, str], list[AtoBruto]]
    doe: Callable[[date, str], str | None]
    texto_nota: Callable[[str], str]

    @classmethod
    def padrao(cls) -> "Fontes":
        return cls(
            dou=baixar_dou,
            doe=lambda dia, sufixo: baixar_edicao(dia, sufixo=sufixo),
            texto_nota=baixar_texto_nota,
        )


def _descrever(erro: Exception) -> str:
    return f"{type(erro).__name__}: {erro}"[:MAX_ERRO]


def _ler_dou(dia: date, fontes: Fontes, erros: list[str]) -> list[AtoBruto]:
    atos: list[AtoBruto] = []
    for secao in SECOES_DOU:
        try:
            atos.extend(fontes.dou(dia, secao))
        except FonteIndisponivel as erro:
            log.warning("DOU %s %s indisponível", dia, secao)
            erros.append(f"{secao}: {_descrever(erro)}")
    return atos


def _ler_doe(dia: date, fontes: Fontes, erros: list[str]) -> tuple[list[AtoBruto], bool]:
    """Devolve (atos, pendente); pendente é a edição comum ainda não publicada (404)."""
    try:
        comum = fontes.doe(dia, "")
    except FonteIndisponivel as erro:
        log.warning("DOE-RO %s indisponível", dia)
        erros.append(_descrever(erro))
        return [], False
    if comum is None:
        return [], True
    atos = dividir_edicao(comum, dia, url_pdf(dia))
    for sufixo in SUFIXOS_DOE_EXTRAS:
        try:
            extra = fontes.doe(dia, sufixo)
        except FonteIndisponivel:
            log.info("DOE-RO %s edição extra %s indisponível", dia, sufixo)
            continue
        if extra is not None:
            atos.extend(dividir_edicao(extra, dia, url_pdf(dia, sufixo)))
    return atos, False


def _bruto(ato: Ato) -> AtoBruto:
    return AtoBruto(
        fonte=ato.fonte,  # type: ignore[arg-type]
        id_externo=ato.id_externo,
        dia=ato.dia,
        edicao=ato.edicao,
        secao=ato.secao,
        orgao=ato.orgao,
        titulo=ato.titulo,
        texto=ato.texto,
        url=ato.url,
        pagina=ato.pagina,
    )


def _com_texto_completo(ato: AtoBruto, fontes: Fontes, buscas: list[int]) -> AtoBruto:
    """Troca o recorte do DOU pelo texto da nota, se a triagem precisar e ainda houver cota."""
    if not precisa_texto_completo(ato) or buscas[0] >= MAX_TEXTOS_COMPLETOS:
        return ato
    buscas[0] += 1
    try:
        return replace(ato, texto=fontes.texto_nota(ato.url))
    except FonteIndisponivel:
        log.warning("Texto completo de nota do DOU indisponível; mantido o recorte")
        return ato


def _gravar_e_triar(atos: list[AtoBruto], fontes: Fontes) -> None:
    """Grava os atos novos; os que a triagem descarta ficam com relevante=False."""
    buscas = [0]
    for lido in atos:
        ato, criado = Ato.objects.get_or_create(
            fonte=lido.fonte,
            id_externo=lido.id_externo,
            defaults={
                "dia": lido.dia, "edicao": lido.edicao, "secao": lido.secao,
                "orgao": lido.orgao, "titulo": lido.titulo, "texto": lido.texto,
                "url": lido.url, "pagina": lido.pagina,
            },
        )
        if ato.relevante is not None:
            continue  # já decidido: nunca é reclassificado
        completo = _com_texto_completo(lido, fontes, buscas)
        if completo.texto != ato.texto:
            ato.texto = completo.texto
            ato.save(update_fields=["texto"])
        if not triar(completo):
            ato.relevante = False
            ato.save(update_fields=["relevante"])


def _somar_consumo(dia: date, uso: Uso) -> None:
    ConsumoDia.objects.get_or_create(dia=dia)
    ConsumoDia.objects.filter(dia=dia).update(
        chamadas=F("chamadas") + uso.chamadas,
        tokens_entrada=F("tokens_entrada") + uso.tokens_entrada,
        tokens_saida=F("tokens_saida") + uso.tokens_saida,
    )


def _salvar_vereditos(fonte: str, vereditos: list[Veredito]) -> None:
    for v in vereditos:
        Ato.objects.filter(fonte=fonte, id_externo=v.id_externo, relevante=None).update(
            relevante=v.relevante,
            pontuacao=v.pontuacao,
            rondonia=v.rondonia,
            titulo_chave=v.titulo_chave,
            resumo=v.resumo,
        )


def _classificar_pendentes(dia: date, fonte: str, llm: ClienteLLM, erros: list[str]) -> None:
    """Classifica em chunks, gravando após cada um; falha do provedor interrompe e guarda o resto."""
    pendentes = list(Ato.objects.filter(fonte=fonte, dia=dia, relevante=None).order_by("id"))
    for i in range(0, len(pendentes), TAMANHO_LOTE):
        chunk = [_bruto(a) for a in pendentes[i : i + TAMANHO_LOTE]]
        try:
            vereditos, uso = classificar(chunk, llm)
        except _ERROS_PROVEDOR as erro:
            log.warning("Provedor falhou na classificação do boletim: %s", type(erro).__name__)
            erros.append(_descrever(erro))
            return
        _salvar_vereditos(fonte, vereditos)
        _somar_consumo(dia, uso)


def coletar_dia(
    dia: date,
    fonte: Literal["dou", "doe"],
    llm: ClienteLLM,
    fontes: Fontes | None = None,
) -> Coleta:
    """Coleta, tria e classifica os atos da fonte no dia; falhas esperadas não levantam."""
    fontes = fontes or Fontes.padrao()
    coleta, _ = Coleta.objects.get_or_create(fonte=fonte, dia=dia)
    coleta.tentativas += 1
    erros: list[str] = []
    pendente = False

    if fonte == "dou":
        atos = _ler_dou(dia, fontes, erros)
    else:
        atos, pendente = _ler_doe(dia, fontes, erros)

    _gravar_e_triar(atos, fontes)
    _classificar_pendentes(dia, fonte, llm, erros)
    escolher_destaque(dia)

    coleta.lidos = len(atos)
    coleta.erro = "; ".join(erros)[:MAX_ERRO]
    if erros:
        coleta.status = Coleta.Status.FALHA
    elif pendente:
        coleta.status = Coleta.Status.PENDENTE
    else:
        coleta.status = Coleta.Status.OK
    coleta.save()
    log.info("Coleta %s %s: %d lidos, status %s", fonte, dia, coleta.lidos, coleta.status)
    return coleta


def escolher_destaque(dia: date) -> None:
    """Marca como destaque o ato relevante de maior (rondonia, pontuacao); empate: o mais novo."""
    Ato.objects.filter(dia=dia, destaque=True).update(destaque=False)
    melhor = (
        Ato.objects.filter(dia=dia, relevante=True)
        .order_by("-rondonia", "-pontuacao", "-coletado_em", "-id")
        .first()
    )
    if melhor is not None:
        Ato.objects.filter(pk=melhor.pk).update(destaque=True)


def expurgar(hoje: date) -> int:
    """Apaga o que passou da retenção; devolve quantos atos foram removidos."""
    limite = hoje - timedelta(days=settings.BOLETIM_RETENCAO_DIAS)
    apagados, _ = Ato.objects.filter(dia__lt=limite).delete()
    Coleta.objects.filter(dia__lt=limite).delete()
    ConsumoDia.objects.filter(dia__lt=limite).delete()
    log.info("Expurgo do boletim: %d atos removidos", apagados)
    return apagados
