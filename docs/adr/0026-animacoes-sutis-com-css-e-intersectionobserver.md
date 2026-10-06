# ADR 0026: Animações sutis com CSS e IntersectionObserver

Status: Aceita

## Contexto

O site é institucional (federação do agro de Rondônia) e já tem algum movimento: fundo com parallax, ticker de notícias, carrossel e livros 3D. Queríamos mais vida e uma leitura mais guiada, sem comprometer a clareza nem os serviços do Painel (filtros, ranking, comparação, PDF), e sem pesar no celular.

## Opções

- **Escolhida:** tokens e classes CSS em `globals.css`, mais dois hooks pequenos baseados em `IntersectionObserver` (`useEntrouNaTela`, `useContador`) e dois componentes (`Revelar`, `NumeroAnimado`). Nenhuma dependência nova.
- **Descartadas:** Framer Motion (30 a 50 KB a mais no bundle e mais superfície de teste, para um efeito que é só fade e contagem); View Transitions API e animações guiadas por scroll em CSS (suporte irregular em Safari e Firefox, exigiria fallback).

## Decisão

- Revelação ao rolar: fade com deslocamento de 12 px, 400 ms, uma única vez por elemento, escalonada em 60 ms entre irmãos até o teto de 4 itens. Só `transform` e `opacity`.
- Nada se esconde antes da hidratação. Só o elemento que começa abaixo da dobra recebe a classe `revelar-pendente` (opacidade 0), posta pelo navegador depois de medir sua posição; o que já está na tela, ou acima dela (link direto para uma âncora), nunca é escondido. Sem JavaScript, com `prefers-reduced-motion`, na impressão ou sem `IntersectionObserver`, o conteúdo aparece normal.
- Contadores nos números do Início, de Sobre e dos Informativos: cerca de 1,2 s, com o valor final sempre no HTML para leitores de tela e SEO. Só conta quem começa abaixo da dobra; o que já está visível fica no valor final, sem voltar a 0. A contagem é opt-in por item (`animar`), porque anos como "1983" não devem contar de 0.
- Painel: cada gráfico (`idEntrada`) anima por 400 ms uma única vez, mesmo que remonte depois do skeleton a cada recorte novo; filtros e troca de tema reaplicam a opção sem animar. Os cartões de números ganham skeleton com a altura do conteúdo final. Nenhuma animação em filtro, ranking, comparação, análise ou PDF.
- Micro-interações só em CSS: elevação de 2 px nos cards clicáveis, seta que desliza, feedback de pressionar nos botões e zoom discreto nas imagens de notícia.

## Consequências

- Se o JavaScript for lento ou falhar, o conteúdo continua visível: o único estado escondido (`revelar-pendente`) só existe depois da hidratação e só em elementos abaixo da dobra. Um elemento abaixo da dobra que já foi marcado como pendente só reaparece ao rolar até ele (e na impressão).
- Os testes de componente simulam `IntersectionObserver` e `matchMedia` (`src/test/mock-observer.ts`); o e2e cobre sem JS, movimento reduzido e âncora direta.
- A regra global de `prefers-reduced-motion` do CSS usa `animation-duration: 0.01ms` sem limitar as repetições; o ticker e o skeleton podem piscar para quem pede movimento reduzido. Isso já existia e ficou fora deste escopo.
- Transição entre páginas e barra de progresso de leitura ficaram para uma etapa futura, se for pedido um nível mais marcante.
