# Legenda de cores por tipo e sistema de tags (área administrativa)

Decidido com o usuário em 18/10/2026:
- **Tags:** os gestores criam, renomeiam e apagam; todos aplicam e filtram.
- **Cor:** a cor indica o **tipo** do item em todo o sistema; a **forma** (ponto, prédio, caminhão, chave) indica a **origem** na agenda.

## 1. Legenda única de tipos

Hoje cada módulo tem a sua lista de tipos:
- **Agenda:** reunião, viagem, compromisso.
- **Espaços:** reunião, curso, palestra, institucional, outro.
- **Atividades:** visita técnica, atendimento, reunião, capacitação, evento, viagem, administrativo, outro.

Elas passam a apontar para um catálogo só, em `apps/web/src/lib/sistema/legenda.ts`:

| Tipo (catálogo) | Cor (claro) | Vem de |
|---|---|---|
| Reunião | verde FAPERON | agenda `reuniao`, espaço `reuniao`, atividade `reuniao` |
| Viagem | aço | agenda `viagem`, atividade `viagem`, reservas da frota |
| Compromisso | ameixa | agenda `compromisso` |
| Capacitação | terra (ocre) | espaço `curso`, atividade `capacitacao` |
| Palestra | vinho | espaço `palestra` |
| Evento institucional | folha escura | espaço `institucional`, atividade `evento` |
| Visita técnica | petróleo | atividade `visita_tecnica` |
| Atendimento ao produtor | barro | atividade `atendimento` |
| Administrativo | grafite | atividade `administrativo` |
| Outro | cinza | `outro` de cada módulo |

- **Cores:** cada tipo tem uma cor forte (texto, ícone, contorno) e uma suave (fundo). As duas viram tokens CSS no claro e no escuro, como `--tipo-reuniao` e `--tipo-reuniao-suave`. O texto forte sobre o fundo suave passa de 4,5:1 nos dois temas.
- **Componente:** `LegendaDeTipos` mostra só os tipos presentes na tela.
- **Agenda:**
  - o chip do evento usa a cor do tipo;
  - o evento próprio (o único editável) tem fundo cheio do tipo;
  - FAPERON e espaço são contornados na cor do tipo, com o ícone da origem;
  - a faixa de viagem já é aço (= Viagem).
- **Espaços, atividades e relatórios:** um selo de tipo com a mesma cor.

## 2. Tags

- **Modelo:** `Tag { id, nome, cor }`, com a cor numa paleta própria de 8 tons, distinta da paleta de tipos e mostrada como ponto + nome.
- **Armazenamento:** a lista fica em `sistema:tags` (via `gravar`/`ler`), compartilhada por todos os funcionários do protótipo.
- **Onde se aplica:** um campo opcional `tags?: string[]` (ids) em `Evento` (só os próprios), `Reserva`, `PedidoEspaco`, `Despesa` e `Atividade`.
- **Quem gere:** `podeGerirTags(f)` vale para coordenador ou qualquer gestor (frota, espaços, contas). Hoje é o Marcos.
- **Gerenciar tags:**
  - um diálogo aberto pela barra do sistema, visível só para quem gere;
  - permite criar, renomear, trocar a cor e apagar;
  - não aceita nome vazio nem duplicado (sem diferenciar maiúsculas e acentos);
  - apagar remove a tag dos itens;
  - cada ação vai para o histórico.
- **Nos formulários:**
  - o seletor de tags é uma lista de chips marcáveis (checkbox acessível);
  - quem gere tem o atalho "Gerenciar tags".
- **Nas listas:** os chips aparecem no item, e cada módulo tem um filtro "Tag" (Todas / uma tag). Na agenda, o filtro vale para o mês e a lista.
- **Nos relatórios:** filtro por tag nos cinco; coluna "Tags", também no CSV, na agenda, nas contas e nas atividades. Frota e espaços somam por veículo e por espaço: têm o filtro, mas não a coluna. Na frota, só as viagens têm tag, então com o filtro ativo as colunas de custo (e o custo por km) ficam vazias.
- **Tags de exemplo:** Dia de campo, Sindicatos, SENAR, Assembleia, Safra 2026/27, Urgente. Algumas já vêm aplicadas nos dados de exemplo.
- **Ajuda:** o tour e o Zétele do sistema (`apps/api/zetele/conhecimento/sistema/`) explicam a legenda e as tags.

A lista final de tags fica para validar com o Tiago Martins.
