# ADR 0034: Zétele do sistema ouve e fala (áudio de entrada e de saída)

Status: Aceita (18/10/2026)

## Contexto

O Zétele da área logada (canal sistema, ADR 0032) só recebia texto. O pedido do usuário foi que ele **receba perguntas em áudio e responda em áudio**, só no sistema; o Zétele público não muda.

O "Agendar por voz" (ADR 0032, `components/sistema/voz/*` e `zetele/voz.py`) continua como está: usa o reconhecimento de voz do navegador (Chrome e Edge) e só preenche formulários. Esta ADR trata da conversa com o Zétele.

A integração com o WhatsApp (ADR 0033) também vai receber áudios. A peça construída aqui deve servir para os dois.

## Opções

Comparação feita em 18/10/2026:

| Fornecedor | Ouvir (áudio → texto) | Falar (texto → áudio) | Preço |
|---|---|---|---|
| **Groq** | Whisper large v3 turbo: rápido e barato, bom em português | Só inglês e árabe: **não serve** para falar | Whisper turbo: **US$ 0,04 por hora** de áudio, com cobrança mínima de 10 s por pedido |
| **Gemini** | Possível, mas mais lento e mais caro que o Whisper da Groq | Gemini 3.8 Flash-Lite TTS: vozes prontas, português do Brasil, estilo descrito em texto | Flash-Lite TTS: **US$ 0,0015 por 10 s** de áudio gerado até 31/12/2026; **o dobro em 2027** |
| OpenAI | `gpt-4o-mini-transcribe` | `gpt-4o-mini-tts` | Sem plano gratuito; fica como troca futura |
| Navegador (Web Speech) | Só Chrome e Edge, qualidade variável, áudio vai ao fornecedor do navegador | `speechSynthesis` com vozes robóticas e diferentes em cada aparelho | Grátis |

- **Escolhida:** **Groq para ouvir** e **Gemini para falar**, cada uma no que faz melhor.
- **Descartadas:**
  - Só Gemini: ouvir ficaria mais lento e mais caro.
  - Só Groq: não fala português.
  - Só o navegador: não funciona no Safari nem no Firefox, e a voz muda de aparelho para aparelho.

## Decisão

- **Fornecedor plugável** (`apps/api/zetele/audio/`):
  - os protocolos `Transcritor.transcrever(conteudo, nome, tipo) -> str` e `Sintetizador.sintetizar(texto) -> bytes` (WAV);
  - uma classe por fornecedor: `TranscritorGroq` (`transcricao.py`) e `SintetizadorGemini` (`sintese.py`);
  - `ZETELE_OUVIR_PROVEDOR` (padrão `groq`) e `ZETELE_FALAR_PROVEDOR` (padrão `gemini`) escolhem a classe nos dicionários `TRANSCRITORES` e `SINTETIZADORES`.
- **Ouvir:** `POST https://api.groq.com/openai/v1/audio/transcriptions`, multipart, com:
  - `model=whisper-large-v3-turbo` (`ZETELE_OUVIR_MODELO`), `language=pt` e `response_format=json`;
  - um `prompt` com os termos que o Whisper erra sem contexto (FAPERON, Zétele, Rondônia, Hilux, Ji-Paraná…).
- **Falar:** `POST https://generativelanguage.googleapis.com/v1beta/interactions` (Interactions API), com:
  - `gemini-3.8-flash-lite-tts` (`ZETELE_FALAR_MODELO`; aceita `gemini-3.8-flash-tts`) e a voz `Kore` (`ZETELE_FALAR_VOZ`);
  - o estilo "tom calmo e acolhedor, sotaque brasileiro".
  - O áudio vem em base64 no último bloco `audio` do último passo `model_output` e é um WAV (24 kHz, mono, 16 bits). Se vier PCM sem cabeçalho, o servidor monta o WAV.
  - O TTS lê tudo ao pé da letra. Antes de sintetizar, `texto_para_fala` tira markdown, links (fica o rótulo), endereços, listas e emojis, e corta em 1.200 caracteres na última frase inteira.
- **Rotas** (só no canal sistema):

| Rota | Entrada | Saída | Teto diário |
|---|---|---|---|
| `POST /api/v1/sistema/zetele/ouvir` | multipart `audio`: até 3 MB, tipo e extensão conferidos (flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm) | `{"texto"}` | **Não conta**: a pergunta conta quando vai ao `/perguntar` |
| `POST /api/v1/sistema/zetele/falar` | JSON `{"texto"}`, até 4.000 caracteres | `audio/wav` | **Conta** no `ZETELE_SISTEMA_LIMITE_DIARIO` (250, "incluindo áudio"); a contagem é devolvida se a síntese falhar |

- **Limites e falhas:**
  - limites por minuto próprios: `zetele_voz` 10/min por IP e `zetele_voz_global` 30/min, divididos entre ouvir e falar;
  - as duas rotas usam o semáforo do Zétele (`ZETELE_SIMULTANEOS`) e respeitam o disjuntor da Anthropic;
  - 429, 5xx, tempo esgotado ou falha de rede do fornecedor abrem um **disjuntor só daquela metade da voz** (`zetele:disjuntor:ouvir` ou `zetele:disjuntor:falar`, 2 minutos). O Zétele em texto continua respondendo;
  - outro 4xx é "pedido recusado" e não abre disjuntor;
  - os timeouts (ouvir 20 s, falar 25 s) ficam abaixo dos 60 s do gunicorn;
  - nem o áudio nem a chave vão para o log.
- **Sem chave, sem voz:** sem `GROQ_API_KEY`, o microfone não aparece; sem `GEMINI_API_KEY`, o botão "Ouvir" não aparece. O `GET /api/v1/sistema/zetele/estado` informa `voz: {ouvir, falar}`, e as rotas respondem `503` com `motivo: "voz_desligada"`. As chaves ficam no `.env.local`, e o CI confere que não estão no `.env.example`.
- **Front** (`components/zetele/*`, só na área do sistema):
  - O microfone grava com `MediaRecorder` (Opus em WebM; no Safari, MP4), com limite de 60 s e contador. Tocar de novo para; Esc cancela.
  - O texto transcrito vai para o campo, para a pessoa conferir antes de enviar.
  - A resposta toca sozinha só quando a pergunta veio por voz ou quando a pessoa liga "Responder em voz" (lembrado no navegador).
  - Cada resposta tem "Ouvir" ("Parar" enquanto toca). Ouvir de novo usa o áudio já baixado e não gasta o limite.
  - O painel mostra o aviso "Protótipo: o áudio é processado pela Groq e pelo Google (plano gratuito)".
  - O proxy do Next aceita multipart de até 3 MB + 64 KB só na rota `/ouvir`; o resto continua com 16 KB.
  - O `Permissions-Policy` passou de `microphone=()` para `microphone=(self)`, porque o `()` bloqueava o `getUserMedia` no próprio site. Outros sites embutidos continuam sem microfone, e o navegador ainda pede permissão à pessoa.

### Plano gratuito no protótipo

É decisão do usuário: no protótipo, a Groq e o Gemini rodam no **plano gratuito**.

- No plano gratuito do Gemini, **a Google usa os dados enviados (texto e áudio) para melhorar os produtos dela**, e pode haver revisão humana.
- Por isso o painel mostra o aviso de protótipo, e o protótipo não deve receber dados pessoais reais.
- **Na contratação, a voz passa para o plano pago** dos dois fornecedores, em que os dados não são usados para treino. Isso inclui revisar os termos de retenção de cada um antes de ligar a voz em produção.

### LGPD

- Voz é dado pessoal (identifica a pessoa) e o conteúdo pode ter outros dados pessoais.
- O áudio da pergunta e o texto da resposta saem do Brasil: vão para a Groq (EUA) e para o Google. Nada disso é gravado pela FAPERON. A transcrição só fica registrada se a pessoa enviar a pergunta, como qualquer pergunta do sistema (ADR 0030 e 0032, 90 dias, sem identificação).
- A base legal, o aviso aos titulares, a transferência internacional e os contratos com os fornecedores ficam com o encarregado de dados da DATA-RO, **Weslley Hariel Lima e Silva Palomeque Gonçalves** (`weslley.palomeque@dataro-it.com.br`). Isso precisa estar resolvido antes de qualquer uso com dados reais ou da troca para o plano pago.

### Trocar de fornecedor

Para trocar por OpenAI (`gpt-4o-mini-transcribe` e `gpt-4o-mini-tts`) ou outro fornecedor:

1. criar, em `zetele/audio/`, uma classe com `transcrever` ou `sintetizar`, usando `audio/http.py` para o mesmo tratamento de 4xx e 5xx;
2. registrar a classe em `TRANSCRITORES` ou `SINTETIZADORES`, com o nome do ajuste da chave (por exemplo, `OPENAI_API_KEY`);
3. definir `ZETELE_OUVIR_PROVEDOR=openai` ou `ZETELE_FALAR_PROVEDOR=openai`.

Views, rotas e front não mudam: o `/falar` sempre devolve WAV, e o `/ouvir` sempre devolve `{"texto"}`.

### Reaproveitamento no WhatsApp (ADR 0033)

O WhatsApp manda áudios em OGG/Opus, um formato que o Whisper aceita. O trabalhador do WhatsApp vai chamar o mesmo `audio.obter_transcritor()` (e, se a resposta for em áudio, o `obter_sintetizador()`), com o mesmo tratamento de falhas e o mesmo teto diário. Só muda o canal de entrada. A resposta em áudio no WhatsApp pode exigir converter o WAV para OGG/Opus (ffmpeg no trabalhador); isso fica para a ADR do WhatsApp.

## Consequências

- O Zétele do sistema pode ser usado sem teclado, inclusive no celular.
- Cada resposta ouvida custa uma chamada do teto diário, além da pergunta. Com 250 por dia, cerca de 125 perguntas com resposta em voz.
- O custo é baixo: uma pergunta de 10 s na Groq custa cerca de US$ 0,0001, e uma resposta de 30 s no Gemini custa cerca de US$ 0,0045 em 2026 (o dobro em 2027). Mesmo assim, ele passa a existir na contratação.
- Há dois fornecedores novos, com chaves, termos e disponibilidade próprios. Os disjuntores separados evitam que a queda de um derrube o texto.
- Os testes não usam rede: fornecedores falsos e `responses` para o REST (`tests/test_zetele_audio.py`). O front usa `MediaRecorder` e `fetch` falsos no Vitest e um e2e com microfone falso do Chromium e rotas simuladas.

## Atualização de 18/10/2026: voz masculina, 1,25x e pronúncia

O usuário ouviu três vozes masculinas nativas do português do Brasil, da biblioteca de vozes do Gemini, e escolheu a **`pt-br-podcaster-1`** (48 anos, tom de conversa). Ela passou a ser o padrão de `ZETELE_FALAR_VOZ`.

- **Velocidade:** a fala toca em **1,25x** no navegador (`playbackRate` com `preservesPitch`). Assim a velocidade é exata e não custa nada a mais. Pedir "fale rápido" ao modelo não dá um número preciso.
- **Pronúncia:** antes da síntese, "Zétele" vira "**Zé-Téle**", com a tônica no "té", só no texto falado. Na tela, o nome continua escrito como sempre.

