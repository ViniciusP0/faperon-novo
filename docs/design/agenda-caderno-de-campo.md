# Agenda do sistema: "caderno de campo" (plano de design)

Plano feito com as skills frontend-design e impeccable para `/sistema/agenda`
(`apps/web/src/components/sistema/agenda/agenda.tsx`). Pedido: um visual mais moderno, sem perder a
simplicidade do agro que o presidente preza, na paleta da FAPERON e com os botões em vidro.

## Assunto, público e tarefa

- **Assunto:** a agenda de um funcionário da federação. Junta compromissos próprios, eventos institucionais, viagens com carro da frota e espaços aprovados.
- **Público:** equipe técnica e administrativa, muitas vezes em campo e no celular.
- **Tarefa principal (modo Operate):** saber o que tem hoje e nos próximos dias, e marcar um compromisso em dois cliques.

## Paleta

| Nome | Hex | Papel |
|---|---|---|
| Verde FAPERON | `#00604e` | número do dia de hoje, eventos próprios, botão principal |
| Verde mata | `#00463a` | painel do dia (o único bloco escuro da tela) |
| Lima de broto | `#8bcd51` | marca de hoje, eventos da FAPERON, "Marcar neste dia" |
| Verde folha | `#63b45a` | espaços aprovados, dia escolhido |
| Palha | `#fbf6e8` | fim de semana no mês |
| Aço | `#2b5672` | viagens da frota |

## Tipografia

Poppins, a fonte do site, numa família só:
- o mês em 30 px semibold, com o ano em light no verde FAPERON;
- o dia em foco em 20 px semibold;
- o corpo em 14 px;
- os horários em semibold com números tabulares.

O mês com o ano mais leve faz a tipografia trabalhar como elemento visual, sem rótulo acima.

## Leiaute

```
Minha agenda                                  [Mês|Lista] [Agendar por voz] [+ Novo evento]
Seus compromissos, os eventos da FAPERON... (uma linha de contexto)

Outubro 2026                 [‹] [Hoje] [›]   ┌───────────────────────┐
Dom  Seg  Ter  Qua  Qui  Sex  Sáb             │ Hoje                  │
┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐            │ Sábado, 17 de outubro │
│  │ │  │ │•9h│ │  │ │  │ │  │ │░░│ palha      │ 09:00–10:00 Reunião   │
└──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘            │ [Marcar neste dia]    │
 ...   (células em cartão leve, hoje com anel lima)└───────────────────────┘
● Meus eventos ● FAPERON ● Viagens ● Espaços  Na sequência
                                              Segunda, 19 · 09:00 Reunião...
```

- **Desktop:** o mês fica à esquerda, alinhado à esquerda. O painel do dia fica à direita (19 rem) e acompanha a rolagem.
- **Celular:** o mês mostra só os números e pontos coloridos. O painel do dia fica embaixo e é por ele que se edita.

## Princípios

1. **Um elemento forte só.** O painel verde-mata do dia, como um quadro de avisos do campo. Todo o resto fica quieto.
2. **A cor tem sentido, com legenda.** Cada origem tem uma cor fixa, explicada na legenda e dita ao leitor de tela. Os selos de texto em cada evento saíram.
3. **O calendário se lê como papel.** Células são cartões leves, sem grade de bordas. O fim de semana fica em tom de palha. Hoje é o broto lima.
4. **Ação perto do dia.** O "+" aparece ao passar o mouse sobre a célula, e o painel tem "Marcar neste dia".

## Revisão contra os padrões genéricos (o que mudei e por quê)

- **Tabela com bordas em todas as células:** era o padrão de qualquer calendário. Troquei por cartões espaçados (`border-spacing`) com sombra de 1 px de deslocamento, que pesa menos e lembra fichas de papel.
- **Dias da semana em caixa alta (DOM, SEG):** é uma das marcas de página gerada. Ficaram em caixa normal, com sábado e domingo no verde da marca.
- **Selo de texto em cada evento:** poluía a célula. Saiu, e a cor com legenda faz esse papel.
- **Card escuro com número grande ("hero metric"):** foi recusado. O painel do dia mostra a agenda do dia, não um total.
- **Um destaque por tela:** cogitei uma faixa de clima e safra no topo, mas a removi. Não há dado real para ela, e seria um segundo elemento forte ("tirar um acessório").

## Verificação

- **Detector do Impeccable:** 0 achados em `agenda.tsx`, `tour.tsx` e `inicio-sistema.tsx`.
- **Contraste:** o texto branco sobre o verde-mata e o verde-escuro sobre o lima passam do AA. O axe roda no e2e do sistema.
- **Responsivo:** conferido em 1440 × 1000 e em 390 × 844, sem rolagem horizontal (e2e `responsivo.spec.ts`).

## Passada de polish do Impeccable (18/10/2026)

Seguiu `reference/polish.md` do Impeccable, com as evidências coletadas na agenda real:
- **Larguras:** 1440, 1280, 1024, 768 e 390 px.
- **Temas:** claro e escuro.
- **Estados:** dia com muitos eventos e título longo, dia escolhido, Lista e foco de teclado.

| Prioridade | Achado | Classe | Correção |
|---|---|---|---|
| 1 (leiaute quebrado) | Título longo em "Na sequência" não encolhia e criava rolagem horizontal (255 px a 1024, 135 px a 1440 no escuro) | defeito local | `min-w-0` nos itens e na coluna; o título é truncado e o texto completo vai no `title` |
| 3 (responsivo) | A 1024 px as duas colunas espremiam o calendário | defeito local | Duas colunas só a partir de 1280 px; abaixo, o painel do dia e "Na sequência" ficam lado a lado sob o mês |
| Conferido | Foco de teclado visível no "+" da célula; cores e contraste no tema escuro; "mais N" no dia cheio; Lista alinhada | — | — |
| Fora do escopo | No celular, o Zétele cobre parte do painel do dia | sobreposição conhecida do Zétele | Registrado para revisão do tamanho do Zétele no celular |

Na confirmação, a rolagem horizontal ficou em zero nas 10 combinações de largura e tema, sem erro no console.

## Segunda passada da frontend-design (18/10/2026): crítica com captura

A revisão contra os padrões genéricos da skill encontrou três vícios na agenda já construída:

| Padrão genérico | Onde | Ajuste |
|---|---|---|
| Kit de cartões de SaaS (todas as células como cartões iguais, com a mesma sombra) | Células do mês | Células planas, com raio de 8 px e contorno de 1 px (a única elevação). A sombra fica só para o painel do dia. |
| Uma palavra destacada em outra cor no título | "Outubro **2026**" com o ano em verde | O ano se diferencia só pelo peso (extralight), na mesma cor |
| Rótulo acima do título ("Hoje", "Dia escolhido") | Painel do dia | Rótulo removido ("tirar um acessório"); hoje ganha o selo lima "hoje" na linha da data, como na Lista |

Na captura de autocrítica, as células brancas sumiam contra o fundo sem a sombra. Por isso entrou o contorno de 1 px.

## Crítica do Impeccable e rodada dos P1 (18/10/2026)

O `critique` do Impeccable rodou com duas avaliações isoladas.

- **Avaliação A** (revisão de design): nota **25/40**, com 3 problemas P1.
- **Avaliação B** (detector + navegador): o código saiu limpo e o axe não achou violações. Só um achado é real: o vidro verde ativo tem contraste de 4,49:1.
- **Registro:** `.impeccable/critique/2026-10-18T18-09-12Z__apps-web-src-components-sistema-agenda-agenda-tsx.md`.

O usuário escolheu os 3 P1 e a viagem em faixa no dia:

| Achado | Correção |
|---|---|
| No celular, tocar num dia não mostrava nada (painel abaixo da dobra) | A tela desce até o painel do dia, respeitando o movimento reduzido. `scroll-mt-40` evita que o painel fique sob o cabeçalho. |
| Origem e possibilidade de editar dependiam só da cor | Cada origem tem uma forma:<br>• ponto cheio: o evento próprio (o único com fundo cheio e editável);<br>• prédio: FAPERON (o chip saiu da palha do fim de semana);<br>• caminhão: frota;<br>• chave: espaço.<br>A legenda usa as mesmas formas. |
| Excluir sem desfazer e salvar sem retorno | Aviso por 6 s, que não some com o mouse ou o foco em cima:<br>• ao excluir: "Evento … excluído" com **Desfazer**;<br>• ao salvar: "Marcado para …", e a agenda vai para o mês e o dia do evento. |
| Contraste do vidro verde (4,49:1) | O gradiente do `.vidro-primario` ficou mais opaco. |
| Viagem como chip de 1 h | A viagem vira **faixa** com o destino, em **todos os dias**, da saída ao retorno:<br>• o primeiro dia mostra "saída 07:00", o meio "dia todo" e o último "volta 19:00";<br>• a faixa da própria pessoa é cheia e leva à reserva;<br>• a do colega ("João em Rolim de Moura") é contornada e só de leitura. |
| Viagens dos colegas | Entram na agenda de todos (`itensDaAgenda(…, equipe)`), mas só as agendadas ou em uso. O histórico concluído não polui a agenda. |

Mudanças de leitura no mês:
- **Dias de fora do mês:** a célula mostra só o número.
- **Rótulo para leitor de tela:** diz "1 evento" ou "N eventos".

Os relatórios continuam só com as viagens da própria pessoa, uma linha por dia.
