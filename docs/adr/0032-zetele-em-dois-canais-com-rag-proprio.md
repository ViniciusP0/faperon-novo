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
