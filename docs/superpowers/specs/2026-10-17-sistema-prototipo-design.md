# Sistema interno (protótipo): agenda individual, gestão de frotas e agendamento de espaços — design

Data: 2026-10-17 · Status: aprovado no brainstorm

## Objetivo

Dar à FAPERON algo navegável para validar, por trás do botão "Acessar o sistema", dois módulos do sistema interno:
- **Agenda de eventos individual:** cada funcionário vê e cria a própria agenda e vê os eventos institucionais da FAPERON.
- **Gestão de frotas:** veículos, reservas, abastecimento e manutenção, e custos.

Critério de sucesso: em uma demonstração, alguém entra como "Carla (Comunicação)", cria um evento, reserva um veículo, vê a reserva na agenda, troca para "Marcos (gestor da frota)", vê outra agenda, registra uma manutenção e vê o custo do veículo no painel. Tudo sem backend e sem dado pessoal real.

## Decisões já tomadas

- **Fidelidade:** protótipo navegável só no front (Next.js), com dados fictícios. O que a pessoa cria fica só no navegador dela. Nada vai para o Django nem para fora do navegador.
- **Entrada (revista a pedido do usuário):** no `/login`, a pessoa entra com o acesso de demonstração `user@faperon.br` / `Senha@123`, conferido no navegador contra o SHA-256 da senha (a senha não fica em texto no código). O login trava a demonstração, mas não é segurança real. Depois, escolhe um entre 5 perfis fictícios. Uma faixa avisa: "Protótipo: dados fictícios, salvos só neste navegador".
- **Agenda:** individual, com os eventos institucionais da FAPERON visíveis para todos (só leitura). As reservas de veículo da pessoa aparecem na agenda dela.
- **Frotas:** cadastro de veículos, reserva e uso, abastecimento e manutenção, e painel de custos.
- **Papel de gestor da frota:** só o gestor cadastra e edita veículos e registra manutenção. Qualquer funcionário reserva veículo e registra abastecimento.
- **Branch:** `feat/sistema-prototipo`, a partir de `feat/zetele`.
- **Agendamento de espaços (pedido do usuário, 17/10/2026):** terceiro módulo, em `/sistema/espacos`, com fila de pedidos, painel de agendamentos e aviso de conflitos. O Marcos (Administrativo) é também o gestor dos espaços.

## Fora do escopo

Autenticação real, backend, persistência compartilhada entre pessoas e máquinas, notificações, convites para eventos, visão da agenda de colegas, integração com calendários externos, exportação, aprovação de reservas.

## Requisitos

### 1. Rotas e entrada
- `/login`: e-mail e senha de demonstração (sem caixa de aviso, a pedido do usuário) e, depois, a lista dos 5 funcionários (nome, área e o selo "Gestor da frota" quando for o caso) e o botão "Entrar como <nome>". O formulário de e-mail e senha sai.
- `/sistema`: saudação, atalhos para Agenda e Frotas, e "Trocar de funcionário" e "Sair" (limpam a sessão e voltam ao `/login`).
- `/sistema/agenda` e `/sistema/frotas`: os dois módulos. As frotas têm abas: Veículos, Reservas, Abastecimento e manutenção, e Custos.
- Sem sessão, `/sistema/*` mostra "Escolha um funcionário para entrar" com o link para o `/login`.
- Metadata `robots: noindex`. As rotas não entram no sitemap e o Zétele não aparece nelas.
- Uma barra do sistema no topo da área mostra quem está logado, a faixa de protótipo e o botão "Restaurar dados de exemplo".

### 2. Dados e estado (`apps/web/src/content/sistema/` e `apps/web/src/lib/sistema/`)
- **Funcionários fictícios (5):**

  | Nome | Área | Observação |
  |---|---|---|
  | Carla Mendes | Comunicação | |
  | Marcos Oliveira | Administrativo | gestor da frota |
  | Ana Ribeiro | Técnica | |
  | João Pereira | Sindical | |
  | Luíza Santos | Presidência | |

  São nomes inventados e não correspondem a pessoas reais.
- **Eventos institucionais:** cerca de 6, com datas relativas ao mês atual (reunião de diretoria, dia de campo, assembleia, curso do SENAR, feira).
- **Frota de exemplo:** 6 veículos, com reservas, abastecimentos e manutenções dos últimos 3 meses gerados a partir de hoje.
- **Sessão:** `sessionStorage["sistema:sessao"]` guarda o id do funcionário.
- **Agenda pessoal:** `localStorage["sistema:agenda:<id>"]`.
- **Frota:** `localStorage["sistema:frota"]`, compartilhada entre os funcionários neste navegador.
- **Restaurar dados de exemplo:** apaga as chaves `sistema:*` e recarrega os dados de exemplo.
- **Storage indisponível:** toda leitura e escrita fica em try/catch e cai para o estado em memória. O protótipo funciona sem storage, só não guarda nada.

### 3. Agenda individual
- **Visões:**
  - **Mês:** grade de 7 colunas, de domingo a sábado, com navegação mês anterior e próximo e o botão "Hoje".
  - **Lista:** os próximos 30 dias, agrupados por dia.
- **Evento:** título (obrigatório), data, início e fim (fim maior que início), local, descrição e tipo (`reuniao` | `viagem` | `compromisso`). A pessoa cria, edita e exclui só os próprios eventos.
- **Institucionais:** selo "FAPERON", sem edição.
- **Reservas de veículo:** as da pessoa logada aparecem como viagem, com o selo "Frota", e o link leva à aba Reservas.
- **Acessibilidade:** a grade do mês é uma tabela com cabeçalhos de dia, e cada dia com eventos lista os títulos. O formulário fica num diálogo com foco gerenciado e fecha com Esc.

### 4. Gestão de frotas
- **Veículos:**
  - Tabela com placa, modelo, ano, km atual, situação calculada (`disponivel` | `reservado` | `em_manutencao`) e próxima revisão.
  - O gestor cadastra e edita. A placa aceita o formato antigo `AAA-9999` e o Mercosul `AAA9A99`, normalizada em maiúsculas e sem hífen para comparar, e não pode repetir.
- **Reservas:**
  - Qualquer funcionário reserva informando veículo, saída e retorno previstos (data e hora), destino e motivo.
  - Recusa se houver choque de horário com outra reserva do mesmo veículo ou se o veículo estiver em manutenção no período.
  - Na saída registra o km inicial e no retorno o km final, que precisa ser maior ou igual ao inicial e atualiza o km do veículo.
  - A reserva pode ser cancelada pelo dono antes da saída.
- **Abastecimento:** qualquer funcionário registra data, veículo, litros, valor total (R$) e km.
- **Manutenção:** só o gestor registra data, veículo, tipo (revisão, pneus, freios, outros), valor (R$), km e um campo "concluída".
- **Alerta de revisão:** revisão a cada 10.000 km ou 12 meses, o que vencer primeiro, a partir da última manutenção do tipo revisão. O alerta é "vencida" quando passou de um dos limites e "próxima" a menos de 1.000 km ou 30 dias.
- **Custos:** por veículo e por mês (os últimos 6), mostra combustível, manutenção, total, km rodados (soma das reservas concluídas) e custo por km. Há um gráfico de barras empilhadas (combustível e manutenção por mês) com o componente `Grafico` do Painel.

### 5. Agendamento de espaços
- **Espaços** (capacidades fictícias, ajustáveis):

  | Espaço | Capacidade |
  |---|---|
  | Auditório | 150 |
  | Hub | 40 |
  | Sala de reuniões | 12 |
  | Núcleo técnico | 20 |
  | Sala da presidência | 8 |

- **Pedido:**
  - espaço, dia e período;
  - períodos: `dia_todo` (08:00–18:00), `manha` (08:00–12:00), `tarde` (13:00–18:00), `noite` (18:00–22:00) e `horario` (início e fim informados, fim maior que início);
  - tipo de evento: `reuniao` | `curso` | `palestra` | `institucional` | `outro`;
  - nome do evento (obrigatório), participantes aproximados (inteiro maior que 0), coffee break (sim ou não) e observações.
- **Fila:**
  - Todo pedido nasce `pendente`.
  - O gestor dos espaços aprova (vira `aprovado`) ou recusa (`recusado`, com motivo obrigatório).
  - Quem pediu pode cancelar (`cancelado`) enquanto o pedido estiver pendente ou aprovado.
- **Conflitos (informar, não esconder):**
  - Ao preencher o pedido, antes de enviar, a tela lista os choques com pedidos `aprovado` ou `pendente` do mesmo espaço, no mesmo dia, com horários sobrepostos (intervalo meio aberto), e avisa quando os participantes passam da capacidade.
  - O pedido pode ir para a fila mesmo com conflito, e fica marcado "com conflito".
  - O gestor vê os conflitos de cada pedido na fila. Aprovar um pedido que choca com outro já aprovado é bloqueado, com mensagem.
- **Painel:**
  - **Semana:** espaços nas linhas e dias da semana nas colunas, com navegação entre semanas. Os blocos mostram horário, nome e status (pendente, aprovado), e os conflitos aparecem destacados.
  - **Fila:** pendentes em ordem de chegada. As ações de aprovar e recusar aparecem só para o gestor.
  - **Meus pedidos:** todos os pedidos da pessoa logada, com status.
- **Agenda:** pedidos aprovados aparecem na agenda de quem pediu, com o selo "Espaço".
- **Estado:** `localStorage["sistema:espacos"]`, compartilhado neste navegador, com pedidos de exemplo gerados a partir de hoje.

### 6. Regras puras e testáveis (`apps/web/src/lib/sistema/`)
- `datas.ts`: grade do mês, intervalos, sobreposição e formatação.
- `placa.ts`: validação e normalização da placa.
- `reservas.ts`: conflito, situação do veículo e km.
- `revisao.ts`: alerta de revisão.
- `custos.ts`: agregação por mês e veículo.
- `espacos.ts`: horário do período, conflitos de um pedido, excesso de lotação e se o pedido pode ser aprovado.
- `armazenamento.ts`: storage seguro.

Os componentes só chamam essas funções.

## Testes
- **Vitest das regras:**
  - placas válidas e inválidas, e repetida;
  - conflito de reserva nas bordas (fim igual ao início do outro não conflita);
  - veículo em manutenção;
  - km final menor que o inicial;
  - revisão vencida e próxima, por km e por data;
  - custos por mês com meses vazios;
  - storage que lança erro;
  - período para horário;
  - conflito de espaço nas bordas;
  - pendente e aprovado contam como conflito, recusado e cancelado não;
  - lotação acima da capacidade;
  - aprovação bloqueada por outro aprovado.
- **Vitest de componentes:**
  - entrar como funcionário;
  - criar um evento e vê-lo no mês e na lista;
  - outro funcionário não vê o evento;
  - institucional sem botão de editar;
  - não gestor não vê "Cadastrar veículo";
  - reserva com conflito mostra erro;
  - reserva criada aparece na agenda;
  - pedido de espaço com conflito mostra o aviso e entra na fila;
  - gestor aprova e o pedido aparece na agenda de quem pediu;
  - não gestor não vê aprovar e recusar.
- **Playwright:** o fluxo do critério de sucesso, o axe sem violações sérias em `/login`, `/sistema/agenda` e `/sistema/frotas`, e o layout no celular sem rolagem horizontal.

## Riscos
- **Ser confundido com o sistema real:** a faixa de protótipo aparece em todas as telas e o `/login` deixa claro que não há conta real.
- **Dados só no navegador:** é a intenção do protótipo e está dito na faixa. O backend real é uma entrega futura, com ADR.
- **Política de privacidade:** continua verdadeira, porque nada sai do navegador. O texto sobre o login, que diz que nada é enviado nem guardado, precisa citar que o protótipo guarda dados fictícios só no navegador.


## Ampliação (17/10/2026, pedidos do usuário)

### Prestação de contas básica (`/sistema/contas`)
- **Despesa:**
  - data, centro de custo (Presidência, Administrativo, Técnica, Comunicação, Sindical; por padrão, o da área do funcionário);
  - categoria: material de escritório, combustível, alimentação, hospedagem, transporte, serviços, eventos, outros;
  - descrição, fornecedor, valor (> 0);
  - comprovante: imagem ou PDF de até 300 KB guardado no navegador; acima disso, só o nome do arquivo.
- **Status:** `rascunho` → `enviada` → `aprovada` | `devolvida` (com observação do gestor). Rascunho e devolvida podem ser editados, excluídos e reenviados.
- **Gestor das contas:** o Marcos (Administrativo) aprova ou devolve.
- **Abas:** Minhas despesas | Aprovação (só gestor) | Por centro de custo (totais por centro e categoria, só aprovadas e enviadas).

### Relatórios (`/sistema/relatorios`)
- **Tipos:** Frota (viagens, km, combustível, manutenção e custo por veículo), Espaços (pedidos por espaço e status, horas aprovadas, conflitos), Agenda (eventos do funcionário e da FAPERON) e Prestação de contas (despesas por centro, categoria, funcionário e status; o gestor vê todos, os demais só os próprios).
- **Período:** de/até, com atalhos "Este mês", "Últimos 30 dias" e "Últimos 3 meses".
- **Saídas:** prévia em tabela com totais, "Imprimir / salvar PDF" (CSS de impressão sem cabeçalho, navegação nem Zétele) e "Baixar CSV" (separador `;`, UTF-8 com BOM, para abrir no Excel).

### Agendar por voz (Agenda, Reservas, Espaços)
- **Transcrição:** o botão "Agendar por voz" usa o reconhecimento de voz do navegador (Web Speech API, `pt-BR`), com a transcrição ao vivo. Sem suporte, aparece um campo para digitar a frase.
- **Interpretação:** `POST /api/v1/sistema/interpretar` com `{tipo: "evento" | "reserva" | "espaco", texto, hoje, veiculos?, espacos?}`. O Django pede ao Claude Sonnet 5.5 a saída estruturada do tipo, com a data de hoje e o dia da semana para resolver "terça" e "dia 20".
- **Conferência em código:** data `YYYY-MM-DD`; horários `HH:mm` com fim depois do início; veículo e espaço precisam estar entre os enviados; números positivos. Campo inválido volta vazio.
- **Formulário:** abre já preenchido, para a pessoa revisar e salvar. Nada é salvo sem confirmação.
- **Limites e registro:** os mesmos do Zétele (por IP, global e diário). A transcrição não é gravada no servidor.
- **Privacidade:** a política cita o serviço de voz do navegador e o envio do texto à Anthropic.
