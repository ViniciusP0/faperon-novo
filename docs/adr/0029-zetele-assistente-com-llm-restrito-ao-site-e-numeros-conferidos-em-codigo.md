# ADR 0029: Zétele, assistente com LLM restrito ao site e números conferidos em código

Status: Aceita

## Contexto

O site precisa de um assistente que explique onde está cada recurso e como usar a Central de Inteligência, e que responda perguntas com números do IBGE que o próprio site publica. A ADR 0007 proíbe texto gerado por LLM no que a FAPERON publica, porque esse texto precisa ser reprodutível e auditável.

## Opções

- **Escolhida:** backend no Django com o SDK Python da Anthropic (Claude Sonnet 5.5), laço manual de ferramentas sobre os serviços determinísticos, base de conhecimento inteira no system prompt com prompt caching, resposta inteira (sem streaming), conferência em código antes de entregar.
- **Descartadas:** Route Handler no Next.js (a chave ficaria no container exposto pelo Funnel e as ferramentas gastariam o limite `anon` por HTTP); RAG já nesta entrega (o conteúdo do site cabe no prompt; embeddings e reindexação sem necessidade); streaming (não permite conferir o texto antes de mostrá-lo).

## Decisão

- O Zétele só responde sobre o site. Fora disso, recusa em uma frase.
- Números vêm só das ferramentas `ranking_municipios`, `evolucao_e_analise`, `bloco_observatorio` e `valor_e_preco_medio`, que chamam as mesmas funções do Painel e do Observatório.
- No Início, o Zétele só orienta para as áreas do site: o pedido vai sem ferramentas e as perguntas prontas são só de navegação. Na Central (Central, Observatório e Painel), fala de dados e de preço, entendido como valor da produção do IBGE e preço médio implícito (valor ÷ quantidade); cotação do dia é indicada na CNA.
- Antes de entregar, `zetele/verificacao.py` exige que todo número do texto exista nos resultados das ferramentas, na base ou na conversa; remove links fora da lista; reprova palavras em inglês e termos bloqueados.
- Se a conferência reprova, a resposta do modelo é descartada e vai uma frase determinística montada a partir do resultado da ferramenta.
- As fontes (IBGE, tabela, ano, link para a consulta equivalente no Painel ou no Observatório) são montadas pelo servidor, nunca pelo modelo.
- Limites: 6/min por IP, 30/min global, 200 perguntas por dia, 3 simultâneas por processo, 40 s por pergunta. Sem chave ou sem orçamento, o widget mostra só as perguntas prontas.
- A chave fica em `.env.local`, lido só pelo container `api`.

## Relação com a ADR 0007

A 0007 continua valendo para todo texto publicado (análise, Observatório, PDF). O Zétele não publica: conversa. Mesmo assim, o LLM só escolhe a ferramenta e redige a ligação entre as partes; todo número sai de uma função determinística já testada, é conferido literalmente e vem com o link da consulta onde o visitante vê o mesmo número. Quando a conferência falha, o texto volta a ser determinístico.

## Consequências

- Custo variável por pergunta (cerca de US$ 0,01 com o prompt em cache) e dependência de um fornecedor externo; o teto diário e o modo degradado limitam os dois.
- O RAG futuro entra pela interface `FonteDeConhecimento` (pgvector no Postgres existente) sem mexer no agente.
- Antes de mudar prompt, base ou modelo, rodar as perguntas de ouro (`pytest -m llm`).
