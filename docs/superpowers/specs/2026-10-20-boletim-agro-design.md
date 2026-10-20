# Boletim do Agro (acesso interno) — design

Estado: **aguardando aprovação**. Registra as decisões do usuário na conversa de 20/10/2026. Nada foi implementado. Itens marcados **(minha escolha)** não foram decididos pelo usuário e podem ser trocados.

## Intenção

A FAPERON, como federação do estado, é diretamente afetada por mudanças legislativas e jurídicas. O boletim junta, dentro do acesso interno, as notas dos diários oficiais que importam ao agronegócio, à agricultura e à agropecuária, para apoiar a gestão de processos. Funciona como um "scrap": todo dia busca os diários nos sites oficiais, separa o que é relevante e publica no sistema com resumo e link para a nota original.

## Objetivos

- Coleta diária e automática do **DOE-RO** (`diof.ro.gov.br`) e do **DOU** (`in.gov.br`), e só desses dois.
- Escopo exclusivo: agronegócio, agricultura e agropecuária.
- Cada nota mostra: número do diário, título-chave, resumo de 4 a 5 linhas e link para a nota original.
- Fica no acesso interno (`/sistema`), no cabeçalho, **logo depois de "Relatórios"**.
- Guarda e mostra até **7 dias** de boletins.
- **Quem vê:** somente coordenação e gestão. **(minha leitura)** No código, isso corresponde aos perfis que já gerenciam tags (`podeGerirTags`: coordenador e os gestores de frota, espaços e contas). O item "Boletim" do menu só aparece para eles, e a API também recusa os demais.

## Primeira visão (opção C, escolhida pelo usuário)

Destaque do dia em grande (número do diário, título-chave, resumo de 4 a 5 linhas, link), e abaixo uma lista curta das outras notas do dia, cada uma com origem (Estado ou União), título, resumo curto e link. Os mockups estão em `.superpowers/brainstorm/222-1792501818/content/` (`primeira-visao.html` e `demo-boletim-19-20-out.html`).

## Critério de relevância (decidido pelo usuário)

- **Entram:** normas e decisões que mudam regras ou direitos do agro em Rondônia, e normas nacionais do agro (Mapa, Banco Central, Anvisa, Incra etc.), mesmo sem citar Rondônia.
- **Entram licitações de agro** só a partir de **R$ 500 mil**.
- **Ficam de fora:** atos de pessoal e de funcionamento interno de órgãos (nomeação, exoneração, férias, diárias etc., de qualquer estado, como Roraima, Mato Grosso e Paraná) e licitações abaixo de R$ 500 mil.
- **Sem revisão humana:** são informações públicas de fonte oficial, para uso interno; o conteúdo vai direto ao boletim.

## Não objetivos

- Outros diários (municipais, tribunais, Mapa próprio etc.) e outros assuntos além do agro.
- Revisão ou aprovação editorial antes de publicar.
- Notícias de imprensa; só diários oficiais.
- Busca textual e histórico além de 7 dias (por enquanto).

## O que seria um fracasso mesmo que "funcione"

- Resumo que afirma algo que o texto oficial não diz. Como não há revisão, o resumo deve se limitar ao conteúdo da nota, e o link para o original é sempre obrigatório.
- Boletim cheio de ruído (pessoal, licitação miúda, habilitação de veterinários) a ponto de a equipe parar de abrir.
- Perder uma norma importante porque a edição do dia ainda não estava publicada no horário da coleta.

## Restrições e dependências

- **Pendência bloqueante: chave da API da Anthropic.** A classificação de relevância e os resumos usam IA; sem `ANTHROPIC_API_KEY` a função não roda. O usuário registrou como pendência a liberação da chave para este uso; até ela estar disponível, a função fica desligada e não pode ser validada com a IA real. **Decidido pelo usuário: é a mesma chave do Zétele** (`ANTHROPIC_API_KEY`, que o sistema já lê do `.env.local` e, na AWS, do parâmetro `anthropic-api-key`); não há chave nem configuração nova. Testes automáticos não chamam a API. **Não há teto de gasto mensal por enquanto**; por isso, registrar o consumo da coleta (chamadas e tokens por dia) para o custo ficar visível, e fazer uma triagem barata antes da IA.
- Monorepo existente: Next.js em `apps/web` (acesso interno em `/sistema`) e Django em `apps/api`, com o app `ingestao` e um `scheduler` que já repete cargas periódicas. Construir sobre isso.
- Fonte DOU: a página por data e seção (`https://www.in.gov.br/leiturajornal?data=DD-MM-AAAA&secao=do1|do2|do3`) traz os atos em JSON dentro de `<script id="params">` (campos como `title`, `hierarchyStr`, `content`, `editionNumber`, `urlTitle`); a nota completa fica em `https://www.in.gov.br/web/dou/-/{urlTitle}`. É preciso mandar `User-Agent` de navegador e usar TLS 1.2; sem isso a conexão cai. Cerca de 6.900 atos em dois dias.
- Fonte DOE-RO: um PDF por dia em `https://diof.ro.gov.br/data/uploads/AAAA/MM/DOE-DD-MM-AAAA.pdf` (extraordinárias e suplementares têm sufixo, como `DOE-EXTRAORDINARIO-...` e `...-SUPLEMENTAR-1`). O texto sai com colunas misturadas e o PDF tem cerca de 2 milhões de caracteres, então precisa ser dividido por ato antes de classificar. A edição do dia só aparece à noite.
- Os links da nota devem apontar para o original: página do ato no DOU; PDF da edição no DOE-RO (com a página, quando possível).

## Achados do demonstrativo de 19 e 20/10/2026

- Filtro só por órgão e palavra-chave deixou 769 de 6.900 atos do DOU; um filtro por tipo de ato reduziu para 58; a escolha final foi de 9. A IA precisa fazer essa última etapa.
- O DOE-RO de 19/10 teve pouco agro (aviso de aluguel da Idaron, uma comissão de titulação da Sepat e contratos de alimentação escolar com agricultura familiar).
- No DOU, as portarias do Incra sobre assentamentos em Rondônia (Jandaíra, em Ariquemes, e Francisco João, em Nova Mamoré) foram o destaque natural para a FAPERON.

## Minhas escolhas (para o usuário conferir)

- **Horário da coleta (minha escolha):** o DOU roda de manhã e traz o dia; o DOE-RO roda à noite e tenta de novo na manhã seguinte se a edição ainda não saiu. O boletim de um dia é atualizado quando chegam novas notas.
- **Notas por dia (minha escolha):** o limite é só de exibição. Tudo o que for relevante é guardado; a tela mostra um destaque e até 10 outras notas, com "ver todas" para o resto. O destaque é a nota mais relevante do dia, com preferência para o que afeta Rondônia, e pode mudar quando chegam as notas da noite (DOE-RO).
- **Licitações, regra dos R$ 500 mil (minha escolha):** vale o valor total estimado da licitação ou contratação. Se o ato não informa valor, a IA decide pela relevância e, na dúvida, deixa de fora. Contratos pequenos, extratos e compras de alimentação escolar da agricultura familiar abaixo do valor ficam de fora, ao contrário do que o demonstrativo sugeriu.
- **Ambientes (minha escolha):** a coleta é ligada por uma variável por ambiente, desligada por padrão, e só roda onde houver chave. Os testes usam saídas gravadas das fontes, sem IA.
- **Seções do DOU (minha escolha):** seção 1 (normas) e seção 3 (licitações e contratos, necessária para a regra dos R$ 500 mil), mais as edições extras do DOU; a seção 2 (pessoal) é ignorada.
- **Sete dias (minha escolha):** dias corridos; a navegação pula dias sem boletim. Os atos coletados de cada dia ficam guardados junto, para poder reclassificar depois; ao passar de 7 dias, o boletim e os atos daquele dia são apagados.
- **Duplicidade, definição (minha escolha):** a mesma nota nunca aparece duas vezes (chave única por fonte e identificador do ato). Retificações aparecem como notas novas. Uma mesma norma publicada nos dois diários aparece uma vez em cada, sem fusão automática.
- **Dia sem nada relevante (minha escolha):** o boletim mostra "Sem notas relevantes hoje" com a data, em vez de ficar vazio ou repetir o dia anterior.
- **Edições extraordinárias e suplementares (minha escolha):** entram na coleta do dia em que forem publicadas.
- **Histórico (minha escolha):** o que passar de 7 dias é apagado do boletim; navegação por dia dentro dessa semana.
- **Duplicidade (minha escolha):** a mesma nota nunca aparece duas vezes, mesmo que a coleta rode de novo.
- **Falha da fonte (minha escolha):** se um diário não puder ser lido, o boletim continua com o que há e indica qual fonte falhou naquele dia.

## O que fica para quem for construir

- Estrutura de dados, telas finais, textos dos prompts da IA, divisão do PDF do DOE-RO em atos, e testes (usar saídas gravadas das fontes, sem chamar a API).
- Estimar o custo da API para o volume diário (uma triagem barata antes da IA ajuda a reduzir).
