"""Falar: texto da resposta → áudio WAV. Hoje só o Gemini TTS (Interactions API); ADR 0034."""

import base64
import binascii
import re
import struct
from typing import Any

from zetele.audio.http import corpo_json, postar
from zetele.cliente import PedidoRecusado

URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/interactions"
TIMEOUT_FALAR = 25.0
LIMITE_FALA = 1200
# Perfil pedido pelo usuário (18/10/2026): um profissional do agro, não um "caipira".
ESTILO = (
    "homem de cerca de 45 anos, profissional experiente do agro brasileiro, que conhece bem a estrutura da FAPERON "
    "e a agropecuária de Rondônia; fala com segurança, cordialidade e clareza, em ritmo natural de conversa; "
    "português do Brasil neutro e urbano, sem sotaque caipira nem jeito de interior"
)
# o Gemini devolve WAV; se vier PCM cru, o cabeçalho usa o formato documentado
TAXA_PCM = 24000

_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
# a pontuação colada no fim do endereço fica (é do texto)
_URL = re.compile(r"https?://[^\s]*[^\s.,;:!?)]")
_INICIO_DE_LINHA = re.compile(r"^(?:#{1,6}\s*|>\s*|[-*+•]\s+|\d+[.)]\s+)+")
_ENFASE = re.compile(r"[*`~]+|(?<!\w)_+|_+(?!\w)")
_EMOJI = re.compile("[\U0001f000-\U0001faff\U0001f1e6-\U0001f1ff☀-➿⬀-⯿️‍⃣]")
_FIM_DE_FRASE = re.compile(r"[.!?…](?=\s|$)")
# Pronúncia pedida pelo usuário (18/10/2026): "Zé Téle", com a tônica no "té". O hífen fazia o modelo
# ler "Telê"; a maiúscula marca a tônica (o Gemini TTS lê maiúscula como ênfase).
_ZETELE = re.compile(r"\bz[eé]tele\b", re.IGNORECASE)


def texto_para_fala(texto: str, limite: int = LIMITE_FALA) -> str:
    """O TTS lê tudo ao pé da letra: tira markdown, links, listas e emojis e corta numa frase inteira."""
    texto = _LINK.sub(r"\1", texto)
    texto = _URL.sub("", texto)
    texto = _ZETELE.sub("Zé TÉle", texto)
    linhas = []
    for linha in texto.splitlines():
        linha = _EMOJI.sub("", _ENFASE.sub("", _INICIO_DE_LINHA.sub("", linha.strip()))).strip()
        if not linha:
            continue
        # título e item de lista sem pontuação viram frase, para a voz fazer a pausa
        if linha[-1] not in ".!?;:…,":
            linha += "."
        linhas.append(linha)
    falado = re.sub(r"\s+", " ", " ".join(linhas))
    falado = re.sub(r"\s+([.,;:!?])", r"\1", falado).strip()
    if not re.search(r"\w", falado):
        return ""
    if len(falado) <= limite:
        return falado
    corte = falado[:limite]
    fins = list(_FIM_DE_FRASE.finditer(corte))
    if fins:
        return corte[: fins[-1].end()].strip()
    return corte.rsplit(" ", 1)[0].strip()


def wav_de_pcm(pcm: bytes, taxa: int = TAXA_PCM, canais: int = 1, bits: int = 16) -> bytes:
    bloco = canais * bits // 8
    cabecalho = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + len(pcm),
        b"WAVE",
        b"fmt ",
        16,
        1,
        canais,
        taxa,
        taxa * bloco,
        bloco,
        bits,
        b"data",
        len(pcm),
    )
    return cabecalho + pcm


def _audio_da_resposta(corpo: dict[str, Any]) -> str:
    """Último passo model_output → último bloco de áudio → data (base64)."""
    passos = [p for p in corpo.get("steps") or [] if isinstance(p, dict)]
    saidas = [p for p in passos if p.get("type") == "model_output"]
    if not saidas:
        return ""
    blocos = [b for b in saidas[-1].get("content") or [] if isinstance(b, dict)]
    audios = [b.get("data") for b in blocos if b.get("type") == "audio"]
    dados = audios[-1] if audios else ""
    return dados if isinstance(dados, str) else ""


class SintetizadorGemini:
    def __init__(self, chave: str, modelo: str, voz: str) -> None:
        self._chave = chave
        self.modelo = modelo
        self.voz = voz

    def sintetizar(self, texto: str) -> bytes:
        corpo = {
            "model": self.modelo,
            "input": [
                {
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": texto,
                            "annotations": [{"type": "speech_metadata", "style": ESTILO}],
                        }
                    ],
                }
            ],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": self.voz}]},
        }
        resposta = postar(
            URL_GEMINI,
            fornecedor="gemini",
            timeout=TIMEOUT_FALAR,
            headers={"x-goog-api-key": self._chave},
            json=corpo,
        )
        dados = _audio_da_resposta(corpo_json(resposta, "gemini"))
        if not dados:
            raise PedidoRecusado("gemini: resposta sem áudio")
        try:
            audio = base64.b64decode(dados, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise PedidoRecusado("gemini: áudio inválido") from exc
        if not audio:
            raise PedidoRecusado("gemini: resposta sem áudio")
        return audio if audio[:4] == b"RIFF" else wav_de_pcm(audio)
