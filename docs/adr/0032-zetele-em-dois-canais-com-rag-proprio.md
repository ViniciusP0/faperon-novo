# ADR 0032: Zétele em dois canais (site público e sistema), cada um com RAG, banco e limites próprios

Status: Aceita

## Contexto

O Zétele nasceu no site público (ADR 0029) e foi levado para a área logada do protótipo do sistema (ADR 0031), onde também interpreta o agendamento por voz. Os dois usos têm público, assunto e custo diferentes. O pedido foi separá-los:

- o interno com teto de 250 chamadas por dia, contando o áudio;
- o público com base de conhecimento, banco de perguntas e limite próprios;
- e uma estrutura de RAG para os dois, no lugar da base inteira colada no prompt.

## Opções

- **Escolhida:** dois canais no mesmo app Django (`zetele/canais.py`). Cada canal tem:
  - páginas, persona e base de conhecimento (`zetele/conhecimento/publico/` e `zetele/conhecimento/sistema/`);
  - índice de busca, tabela de perguntas, teto diário, limite por IP e teto por minuto;
  - endpoints próprios.

  Modelo, chave e disjuntor são compartilhados, porque uma falha da Anthropic derruba os dois.
- **Descartadas:**
  - Um app ou serviço separado para o Zétele do sistema: duplicaria cliente, conferência e testes sem ganho.
  - Separar só por um campo `canal` na mesma tabela: o pedido foi um banco separado, e a tabela própria deixa retenção, exportação e acesso independentes.
  - Busca vetorial com embeddings já agora: exige outro fornecedor e chave (a Anthropic não tem endpoint de embeddings), e a base ainda é pequena.

## Decisão

- **RAG** (`zetele/rag/`):
  - `documentos.py` lê os `.md` da pasta do canal (seções `## [/rota] Título`) e fatia seções longas por parágrafo ou item, sem cortar frase.
  - `indice.py` é um BM25 em português (sem acento, sem palavras vazias, radical simples, título com peso 2).
  - `recuperador.py` define o `Protocol Recuperador`. O `RecuperadorLexico` põe os trechos da página atual primeiro e completa com os mais parecidos com a pergunta (e com a pergunta anterior), até 6.
  - Os trechos vão na mensagem da pergunta, dentro de `<base_de_conhecimento>`. O system prompt fica só com persona e catálogo, e continua estável para o cache.
- **Conferência:** o código aceita números e links presentes em toda a base do canal (`texto_completo()`), não só nos trechos enviados.
- **Banco:** perguntas do site público em `zetele_pergunta` e do sistema em `zetele_pergunta_sistema`, as duas por 90 dias (ADR 0030). O `zetele_exportar` ganha `--canal`. A transcrição da voz continua sem ser gravada.
- **Limites e rotas:**

| Canal | Teto diário | Limite por IP | Teto por minuto | Rotas |
|---|---|---|---|---|
| Público | `ZETELE_LIMITE_DIARIO=200` | `zetele` 6/min | `zetele_global` 30/min | `/api/v1/zetele/estado` e `/perguntar` |
| Sistema | `ZETELE_SISTEMA_LIMITE_DIARIO=250` | `zetele_sistema` 10/min | `zetele_sistema_global` 30/min | `/api/v1/sistema/zetele/estado`, `/perguntar` e `/api/v1/sistema/interpretar` (voz) |

  A voz gasta o teto do sistema. Esgotar um canal não afeta o outro.
- **Front:** `baseDoZetele(pagina)` escolhe o endpoint pela área. Ao trocar de área, a conversa recomeça com o outro Zétele, com boas-vindas e textos próprios.

## Consequências

- A base pode crescer (FAQ, documentos) sem inflar cada chamada: entram só os trechos relevantes.
- Trocar para busca vetorial é implementar outro `Recuperador` e apontar `recuperador_do_canal` para ele. As fontes em Markdown e o fatiamento continuam.
- Uma resposta pode precisar de um trecho que a busca não trouxe. A página atual entra sempre, e as perguntas de ouro (`pytest -m llm`, agora com casos do sistema) medem isso antes de cada mudança de base ou prompt.

## Atualização de 18/10/2026: auditoria de segurança e integridade

Uma auditoria independente (dois agentes, segurança e integridade) achou falhas no limite de gasto. Todas foram corrigidas e testadas em `tests/test_zetele_seguranca.py`:

- **Teto diário no Postgres** (`zetele_contagem_diaria`, por canal e dia, com incremento atômico `F() + 1`).
  - No cache em arquivo, o `incr` do Django regravava a chave com o prazo padrão de 300 s, e o teto zerava depois de 5 minutos sem perguntas.
  - Além disso, o limite padrão de 300 entradas despejava chaves ao acaso. O cache agora aceita até 20.000 entradas.
  - O expurgo de 90 dias apaga também os contadores antigos.
- **Gasto só com vaga no semáforo:** a cota é contada depois de pegar a vaga, então resposta "ocupado" não gasta o dia. Quando o teto já estourou, a contagem é devolvida.
- **Só JSON** (`JSONParser`) nos endpoints que gastam a cota: um formulário simples de outro site não consegue mais disparar perguntas pelo navegador de quem o visita.
- **Disjuntor só para falha do provedor:** abre com 429, 5xx/529 ou falha de rede. Um 4xx do pedido vira `PedidoRecusado` e não tira o assistente do ar.
- **Tempo de cada chamada** limitado ao que resta dos 40 s do agente, abaixo do timeout de 60 s do gunicorn.
- **Links:** um link dentro do texto de outro link vira texto puro, porque o front leria o link de dentro, sem conferência. O front recusa rota com barra invertida ou caractere de controle, que o navegador leria como outro domínio.

**Riscos aceitos no protótipo:**
- Os endpoints do sistema são abertos, porque o login do protótipo só existe no navegador (ADR 0031). A contenção é por IP, teto global e teto diário de 250.
- Os números citados em turnos anteriores do próprio histórico do cliente contam como referência, então um histórico forjado pode fazer o Zétele repetir um número falso. Não há dano além de uma captura de tela.
- A senha de demonstração está nos testes e na spec, sem dado real por trás.

O login real do sistema definitivo fecha os dois primeiros riscos.

## Atualização de 18/10/2026: tetos diários triplicados

Por pedido do usuário, os tetos diários foram triplicados nos dois canais:
- **site público:** `ZETELE_LIMITE_DIARIO` passou de 200 para **600**;
- **sistema:** `ZETELE_SISTEMA_LIMITE_DIARIO` passou de 250 para **750**, ainda contando o áudio.

Os limites por minuto (por IP e globais) continuam iguais, porque eles protegem contra rajadas, não contra o volume do dia. No pior caso, o gasto diário com o modelo também triplica. Os tetos continuam ajustáveis no `.env` de cada servidor.
