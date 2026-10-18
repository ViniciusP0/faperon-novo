"""Ouvir: áudio da pergunta → texto. Hoje só a Groq (Whisper large v3 turbo); ADR 0034."""

from zetele.audio.http import corpo_json, postar

URL_GROQ = "https://api.groq.com/openai/v1/audio/transcriptions"
# abaixo do timeout de 60 s do gunicorn, com folga para o resto do pedido
TIMEOUT_OUVIR = 20.0
# vocabulário que o Whisper erra sem contexto (o prompt aceita até 224 tokens)
VOCABULARIO = (
    "FAPERON, Zétele, Rondônia, Porto Velho, Ji-Paraná, Ariquemes, Vilhena, Cacoal, "
    "Hilux, agenda, frota, auditório, prestação de contas."
)


class TranscritorGroq:
    def __init__(self, chave: str, modelo: str) -> None:
        self._chave = chave
        self.modelo = modelo

    def transcrever(self, conteudo: bytes, nome: str, tipo: str) -> str:
        resposta = postar(
            URL_GROQ,
            fornecedor="groq",
            timeout=TIMEOUT_OUVIR,
            headers={"Authorization": f"Bearer {self._chave}"},
            files={"file": (nome, conteudo, tipo)},
            data={
                "model": self.modelo,
                "language": "pt",
                "response_format": "json",
                "prompt": VOCABULARIO,
            },
        )
        texto = corpo_json(resposta, "groq").get("text")
        return texto.strip() if isinstance(texto, str) else ""
