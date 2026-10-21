# ADR 0035: Boletim do Agro, coleta diária do DOE-RO e do DOU com IA

Status: Aceita (21/10/2026)

## Contexto

A FAPERON, como federação do estado, é afetada por mudanças legislativas e jurídicas. A coordenação e a gestão precisam acompanhar o que os diários oficiais publicam sobre agronegócio, agricultura e agropecuária, sem ler edições inteiras: o DOU tem cerca de 6.900 atos em dois dias e o PDF do DOE-RO passa de 2 milhões de caracteres. O detalhe das decisões e dos achados está em `docs/superpowers/specs/2026-10-20-boletim-agro-design.md`.

## Opções

- **Link para as buscas dos diários:** sem código, mas a equipe continua filtrando à mão. Descartada.
- **Só filtro por órgão e palavra-chave:** no demonstrativo de 19 e 20/10, deixou 769 de 6.900 atos do DOU. Ruído demais; a equipe pararia de abrir. Descartada.
- **Triagem barata e IA só no que sobra (escolhida):** a triagem por órgão, tipo de ato e valor da licitação reduz o volume antes da IA, que classifica a relevância e escreve o resumo.

## Decisão

- **Coleta no `scheduler` existente** (app Django `boletim`), sem Celery nem fila nova (ADR 0013). O DOU roda de manhã; o DOE-RO roda à noite e tenta de novo na manhã seguinte se a edição ainda não saiu.
- **Triagem antes da IA** (`triagem.py`): órgãos e tipos de ato do agro, e regra de R$ 500 mil para licitações. Atos de pessoal ficam de fora.
- **IA por lote atrás da interface `ClienteLLM`:** classifica a relevância e resume em 4 a 5 linhas, limitada ao conteúdo da nota. Todos os testes usam fontes gravadas e um LLM falso; nenhum chama a API real. Usa a mesma `ANTHROPIC_API_KEY` do Zétele.
- **Janela de 7 dias** (`BOLETIM_RETENCAO_DIAS`): o que passa disso é apagado junto com os atos do dia. A mesma nota nunca aparece duas vezes (chave única por fonte e identificador).
- **Desligado por padrão** (`BOLETIM_ATIVO=0`): só roda onde alguém ligar, e só com chave.
- **Consumo de IA registrado sem teto** (`ConsumoDia`): o custo fica visível, mas não há limite de gasto por enquanto.
- **Sem revisão humana:** são informações públicas de fonte oficial, para uso interno. Em contrapartida, o link para a nota original é obrigatório e a tela avisa que o resumo é de IA.
- **Falha de uma fonte** não derruba o boletim: a API informa a situação de cada diário e a tela avisa qual não foi lido.
- **Tela** em `/sistema/boletim`, depois de "Relatórios" no menu, no padrão visual do site: destaque do dia, até 10 outras notas, "ver todas", navegação por dia e filtro por origem (Estado, União).
- **Restrição por perfil só na interface:** o item de menu e a página aparecem apenas para quem gere tags (`podeVerBoletim = podeGerirTags`: coordenador e gestores). A API de leitura (`/api/v1/boletim/*`) **não exige login**, porque o login do sistema é do protótipo e roda só no navegador (ADR 0031). Isso difere do que o desenho inicial previa ("a API também recusa os demais").

## Consequências

- **Positivas:** a equipe lê o que importa em minutos; o volume que chega à IA é pequeno; testes determinísticos e sem custo; a coleta é desligável por ambiente.
- **Negativas e riscos:**
  - Como a API é pública e sem login, qualquer pessoa que conheça a rota lê o boletim. O conteúdo é público (diários oficiais) e os resumos não têm dado interno, então o risco é baixo. A restrição de verdade fica para o sistema definitivo, com autenticação no backend.
  - Sem revisão humana, o resumo pode errar. A mitigação é o prompt limitado ao texto da nota e o link para o original.
  - Sem teto de gasto, um volume inesperado pode custar caro. A mitigação é a triagem e o registro de consumo por dia.
  - O formato das páginas do DOU e do PDF do DOE-RO pode mudar; os leitores são testados só contra fixtures de 19 e 20/10/2026.
- **Pendente:** calibrar o prompt de `classificador.py` contra a API real (falta a chave) antes de ligar `BOLETIM_ATIVO=1`.
