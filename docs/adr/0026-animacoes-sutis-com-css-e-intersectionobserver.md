# ADR 0026: Animações sutis com CSS e IntersectionObserver

Status: Aceita

## Contexto

O site é institucional (federação do agro de Rondônia) e já tem algum movimento: fundo com parallax, ticker de notícias, carrossel e livros 3D. Queríamos mais vida e uma leitura mais guiada, sem comprometer a clareza nem os serviços do Painel (filtros, ranking, comparação, PDF), e sem pesar no celular.

## Opções

- **Escolhida:** tokens e classes CSS em `globals.css`, mais dois hooks pequenos baseados em `IntersectionObserver` (`useEntrouNaTela`, `useContador`) e dois componentes (`Revelar`, `NumeroAnimado`). Nenhuma dependência nova.
- **Descartadas:** Framer Motion (30 a 50 KB a mais no bundle e mais superfície de teste, para um efeito que é só fade e contagem); View Transitions API e animações guiadas por scroll em CSS (suporte irregular em Safari e Firefox, exigiria fallback).

## Decisão

- Revelação ao rolar: fade com deslocamento de 12 px, 400 ms, uma única vez por elemento, escalonada em 60 ms entre irmãos até o teto de 4 itens. Só `transform` e `opacity`.
- O estado oculto só vale com `html.js-ok`, classe posta por um script inline no `<head>`. Sem JavaScript, com `prefers-reduced-motion` ou sem `IntersectionObserver`, o conteúdo aparece normal.
- Contadores nos números do Início, de Sobre e dos Informativos: cerca de 1,2 s, com o valor final sempre no HTML para leitores de tela e SEO. A contagem é opt-in por item (`animar`), porque anos como "1983" não devem contar de 0.
- Painel: gráficos ECharts animam por 400 ms só na primeira renderização; filtros e troca de tema reaplicam a opção sem animar. Os cartões de números ganham skeleton com a altura do conteúdo final. Nenhuma animação em filtro, ranking, comparação, análise ou PDF.
- Micro-interações só em CSS: elevação de 2 px nos cards clicáveis, seta que desliza, feedback de pressionar nos botões e zoom discreto nas imagens de notícia.

## Consequências

- Se o JavaScript falhar depois de o `js-ok` ser posto, as seções com revelação ficam ocultas até a hidratação; nesse caso o site já estaria sem menu e sem tema, então aceitamos o risco.
- Os testes de componente simulam `IntersectionObserver` e `matchMedia` (`src/test/mock-observer.ts`); o e2e cobre sem JS, movimento reduzido e âncora direta.
- A regra global de `prefers-reduced-motion` do CSS usa `animation-duration: 0.01ms` sem limitar as repetições; o ticker e o skeleton podem piscar para quem pede movimento reduzido. Isso já existia e ficou fora deste escopo.
- Transição entre páginas e barra de progresso de leitura ficaram para uma etapa futura, se for pedido um nível mais marcante.
