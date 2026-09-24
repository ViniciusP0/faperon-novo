# ADR 0019: Início com faixa de indicadores "Rondônia em números"

Status: Aceita

## Contexto

O cliente avaliou cinco modelos para a tela Início (`docs/design/mocks/`) e escolheu o Mock 2. A referência é a home da CNI: uma seção de indicadores em destaque que leva ao painel de dados. O Início precisava mostrar a Central de Inteligência com dados reais sem depender de várias chamadas à API.

## Opções

- **Escolhida:** manchete com números do IBGE, faixa de seis indicadores com tendência e detalhe por indicador (evolução e municípios líderes), seguida de notícias, Central, commodities (link para a CNA) e Nosso Agro.
- **Descartadas:** busca como página (Mock 1), portal por público (Mock 3), editorial (Mock 4) e balcão do produtor (Mock 5).

## Decisão

- Novo endpoint `GET /api/v1/destaques` (contrato em `docs/api-contract.md`) devolve, em uma chamada, total, série de 10 anos, variação e cinco municípios líderes de soja, milho, café canéfora, cacau, rebanho bovino e leite. Recortes sem dados são omitidos.
- O front converte o leite de mil litros para litros na exibição (`normalizarDestaque`) e monta a manchete por regra (`manchete`), sem texto fixo. Se o ano do indicador difere do ano da soja, a frase mostra o ano entre parênteses.
- A faixa é acessível: abas com setas, Home e End, descrição textual do gráfico e tabela alternativa para leitores de tela.
- O cabeçalho passa a ser claro (símbolo e nome da FAPERON) em todas as páginas, como no modelo aprovado.
- Nosso Agro exibe números vindos da API (culturas, cabeças de gado e municípios); o título e a introdução continuam vindo do Wagtail.

## Consequências

- O Início depende de três chamadas de leitura (conteúdo, destaques e contagens), todas com cache de dados no Next.js.
- Trocar os indicadores em destaque exige mudar `DESTAQUES` em `apps/api/indicadores/api/destaques.py` e a frase em `apps/web/src/lib/destaques.ts`.
- O bloco "O que você precisa hoje?" do Mock 3 e o botão fixo de WhatsApp do Mock 5 ficam como candidatos para a Fase 2.
