# ADR 0022: Painel em página narrativa em vez de abas

Status: Aceita

## Contexto

O painel era um formulário com quatro abas (Ranking, Série, Comparação, Análise). O dado principal ficava dentro de uma tabela de 52 linhas e a página parecia uma ferramenta colada no site. O público prioritário é o geral e a imprensa, que precisam entender o recorte em segundos. Especificação: [SPEC-09](../specs/spec-09-painel-narrativo.md).

## Opções

- **Escolhida:** página rolável com seções sempre visíveis: manchete e quatro números-chave, dez maiores em barras, evolução em área, comparação e análise.
- **Descartadas:** só retocar o visual das abas (não resolve a hierarquia) e um dashboard denso de widgets (agrada técnicos, cansa o público geral).

## Decisão

- As abas viram seções com âncoras; `aba` na URL continua aceito e rola até a seção equivalente, para não quebrar links compartilhados.
- O território (município) passa a ser filtro global da barra de recorte; o ranking segue sempre estadual.
- A tabela completa de 52 municípios fica recolhida, e cada gráfico mantém sua tabela alternativa.
- Sem mudança na API, no PDF nem no formato da URL.

## Consequências

- Abrir um recorte dispara ranking, série e análise ao mesmo tempo (a comparação só com dois itens ou mais); aceitável porque a API lê de views materializadas ([0005](0005-postgresql-com-star-schema-e-views-materializadas.md)) e as seções compartilham o cache do React Query.
- Os testes E2E de abas viram testes de navegação por seções.
