# Animações sutis no site FAPERON — design

Data: 2026-10-06 · Status: aguardando revisão

## Objetivo

Dar mais vida e sensação de qualidade ao site, ajudando o visitante a entender e percorrer o conteúdo, sem comprometer a clareza atual nem os serviços já funcionais (Painel, filtros, análise/PDF, login, contato).

## Decisões já tomadas

- **Intensidade:** sutil e institucional. O público é o agro de Rondônia (produtores, sindicatos, parceiros); o tom é de credibilidade.
- **Abordagem:** CSS puro mais um pequeno hook de `IntersectionObserver`, sem dependência nova (descartados Framer Motion e View Transitions API).
- **Fora do escopo:** transição entre páginas, ilustrações novas, barra de progresso de leitura, qualquer mudança em lógica, API ou dados.

## Estado atual (não será alterado)

Já existem: `FundoParallax` (café, cacau, milho e soja nas laterais), ticker de notícias (`@keyframes marquee`), carrossel do hero, livros 3D dos informativos, botão de tema, e a regra global de `prefers-reduced-motion` em `apps/web/src/app/globals.css`. Esses itens ficam como estão.

## Requisitos

### 1. Fundação de movimento (`globals.css`)

- Tokens: `--mov-rapido: 150ms`, `--mov-base: 400ms` e `--mov-easing: cubic-bezier(0.2, 0.8, 0.2, 1)` (o mesmo easing do livro 3D).
- Classe `.revelar`: estado inicial `opacity: 0` e `translateY(12px)`; estado final com a classe `.revelar-visivel`.
- O estado inicial oculto só vale quando `<html>` tem a classe `js-ok`. Sem JS, o conteúdo aparece normal.
- Com `prefers-reduced-motion: reduce`, tudo aparece de imediato, sem deslocamento.

### 2. Componente `<Revelar>`

- Dispara uma única vez, ao entrar na viewport (`IntersectionObserver`, threshold baixo, sem observar de novo depois de revelado).
- Escalonamento opcional entre filhos de 60 ms, limitado a 4 itens, para a revelação nunca parecer lenta.
- Sem `IntersectionObserver` disponível, ou em reduced-motion, revela imediatamente.
- Aplicado nas seções da Início, nos cards da Central de Inteligência e nas seções de Sobre, Sindicatos Rurais, IPAGRO e Comissão Mulheres.
- Conteúdo acima da dobra não pode "piscar": o que já está visível no carregamento aparece sem atraso perceptível.

### 3. Contadores (`useContador`)

- Aplicado à faixa "Rondônia em números" e aos números do Início.
- Conta de 0 até o valor em cerca de 1,2 s, uma vez, ao entrar na tela, usando o `formatNumero`/`formatCompacto` existentes.
- O valor final real permanece no HTML (SEO, leitores de tela e sem JS). O contador só anima o texto visível, sem alterar o que um leitor de tela lê.
- Em reduced-motion, mostra o valor final direto.

### 4. Micro-interações

- Cards clicáveis: elevação suave (sombra e 2 px) no hover e no foco.
- Links com `ArrowUpRight`: a seta desliza levemente no hover.
- Botões: feedback de pressionar. Estado de foco consistente com o `:focus-visible` atual.
- Só `transform`, `opacity` e `box-shadow`; nada que cause reflow.

### 5. Painel (cuidado extra)

- Gráficos ECharts: entrada curta (cerca de 400 ms) via configuração nativa de animação; atualizações por filtro sem animação longa.
- Cards de dados: skeleton no estado de carregamento, com a mesma altura do conteúdo final, para não haver salto de layout.
- Nenhuma animação em interações de filtro, ranking, comparação, análise ou PDF.

## Restrições transversais

- Acessibilidade: respeitar `prefers-reduced-motion`; axe (`@axe-core/playwright`) continua passando; contraste e foco inalterados.
- Funciona nos temas claro e escuro e no celular.
- Performance: animar apenas `transform`/`opacity`; um único observer por componente, desconectado ao revelar; sem `will-change` permanente.
- Sem dependência nova no `package.json`.

## Testes

- Unitários (vitest): `useContador` e `<Revelar>`, incluindo reduced-motion e ausência de `IntersectionObserver`.
- Os testes unitários e e2e existentes rodam sem alteração de expectativa.
- Captura de tela em claro/escuro, desktop e celular, antes de publicar.

## Entrega

- Depois de implementar e verificar (typecheck, lint, test, e2e, build), publicar na demo do Tailscale com `docker compose up -d --build web` e conferir o link público, conforme a regra permanente do projeto.
- Commits atômicos em Conventional Commits.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Conteúdo oculto se o JS falhar | Estado inicial oculto só com `html.js-ok` |
| Layout shift nos números e skeletons | Reservar a altura final; contador só troca o texto |
| Piscada de conteúdo acima da dobra | Revelar imediatamente o que já está na viewport |
| Regressão no Painel | Nenhuma animação em filtros; testes do Painel inalterados |
| Testes quebrando por `IntersectionObserver` no jsdom | Fallback que revela na hora quando o observer não existe |
