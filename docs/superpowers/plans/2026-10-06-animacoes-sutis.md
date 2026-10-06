# Animações sutis do site FAPERON — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar vida ao site com revelação ao rolar, contadores nos números, micro-interações e entrada curta nos gráficos, sem afetar os serviços do Painel.

**Architecture:** CSS puro (tokens e classes em `globals.css`) mais dois hooks pequenos baseados em `IntersectionObserver` (`useEntrouNaTela`, `useContador`) e dois componentes (`Revelar`, `NumeroAnimado`). O estado oculto da revelação só vale com `html.js-ok`, classe posta por um script inline no `<head>`; sem JS ou com movimento reduzido o conteúdo aparece normal.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind 3, vitest + Testing Library (jsdom), Playwright, ECharts. **Nenhuma dependência nova.**

**Spec:** `docs/superpowers/specs/2026-10-06-animacoes-sutis-design.md`

Todos os comandos rodam em `apps/web` (exceto Docker e git, na raiz do repositório). Mensagens de commit seguem Conventional Commits e terminam com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Global Constraints

- Intensidade sutil e institucional; nada de transição entre páginas, ilustrações novas ou barra de progresso de leitura.
- Tokens: `--mov-rapido: 150ms`, `--mov-base: 400ms`, `--mov-easing: cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Revelação: `opacity: 0` e `translateY(12px)` → visível; dispara uma única vez; escalonamento de 60 ms entre irmãos, no máximo 4 itens.
- Estado inicial oculto só com `html.js-ok`; com `prefers-reduced-motion: reduce` tudo aparece de imediato.
- Contadores: cerca de 1,2 s, uma vez, o valor final fica no HTML (leitores de tela/SEO); usam os formatos pt-BR já existentes.
- Gráficos ECharts: entrada de cerca de 400 ms **só na primeira renderização**; filtros e troca de tema não reanimam.
- Painel: nenhuma animação em filtro, ranking, comparação, análise ou PDF. Skeleton dos cartões com a altura do conteúdo final.
- Só `transform`, `opacity` e `box-shadow` (sem reflow); sem `will-change` permanente; um observer por componente, desconectado ao revelar.
- Sem dependência nova no `package.json`; claro e escuro; mobile.
- Testes e2e e unitários existentes seguem sem mudança de expectativa.

## Review Focus

1. **JS desligado ou hidratação ainda não ocorreu:** o conteúdo precisa estar visível (teste e2e sem JavaScript, Task 4).
2. **Movimento reduzido:** tudo aparece de imediato e os contadores mostram o valor final, sem registrar observer (testes unitários, Tasks 2 e 3; e2e, Task 4).
3. **Link direto para âncora** (`/sobre#estatuto`) numa seção ainda não revelada: deve ficar visível ao chegar (e2e, Task 4).
4. **Valores não numéricos e anos nos contadores** (`X`, `–`, `1983`): texto original, sem contar de 0 a 1983 (testes de `lerNumeroPtBr`, Task 1; flag `animar` na `FaixaNumeros`, Task 5).
5. **Gráfico reanimando** a cada filtro ou troca de tema, o que seria lento e distrairia (teste de `comEntrada`, Task 7; `Grafico` anima só no primeiro desenho).

## File Structure

| Arquivo | Responsabilidade |
| --- | --- |
| `src/lib/movimento.ts` (novo) | Funções puras: detecção de movimento reduzido/observer, easing, leitura e formatação de números pt-BR, `SCRIPT_JS_OK` |
| `src/test/mock-observer.ts` (novo) | Helpers de teste: `IntersectionObserver` falso e `matchMedia` falso |
| `src/components/site/use-entrou-na-tela.ts` (novo) | Hook: `entrou` vira `true` uma única vez ao aparecer na tela |
| `src/components/site/revelar.tsx` (novo) | Wrapper que revela o conteúdo ao rolar |
| `src/components/site/use-contador.ts` (novo) | Hook: valor exibido contando de 0 até o alvo |
| `src/components/site/numero-animado.tsx` (novo) | Componente do número animado, com o valor final para leitores de tela |
| `src/app/globals.css` | Tokens, `.revelar`, `.card-elevar` |
| `src/app/layout.tsx` | Script inline que põe `js-ok` no `<html>` |
| `src/lib/chart-options.ts` / `src/components/painel/grafico.tsx` | `comEntrada` e animação só na primeira renderização |
| `e2e/animacoes.spec.ts` (novo) | Cobertura e2e da revelação |

---

### Task 1: Fundação de movimento (funções puras, CSS e script `js-ok`)

**Files:**
- Create: `src/lib/movimento.ts`
- Create: `src/lib/movimento.test.ts`
- Create: `src/test/mock-observer.ts`
- Modify: `src/app/globals.css` (acrescentar após o bloco `@media (prefers-reduced-motion: reduce)`, antes de `.prose-faperon p`)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces (usados nas Tasks 2, 3 e 7):
  - `reducaoDeMovimento(): boolean`
  - `temObserver(): boolean`
  - `easeOutCubic(t: number): number`
  - `interface LeituraNumero { prefixo: string; alvo: number; casas: number; sufixo: string }`
  - `lerNumeroPtBr(texto: string): LeituraNumero | null`
  - `formatarNumeroPtBr(leitura: LeituraNumero, progresso: number): string`
  - `SCRIPT_JS_OK: string`
  - Em `src/test/mock-observer.ts`: `instalarObserverFalso(): { instancias: Instancia[]; disparar(): void }` e `definirMovimentoReduzido(ativo: boolean): void`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/movimento.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { definirMovimentoReduzido, instalarObserverFalso } from "@/test/mock-observer";
import {
  SCRIPT_JS_OK,
  easeOutCubic,
  formatarNumeroPtBr,
  lerNumeroPtBr,
  reducaoDeMovimento,
  temObserver,
} from "./movimento";

afterEach(() => vi.unstubAllGlobals());

describe("lerNumeroPtBr", () => {
  it("lê inteiros", () => {
    expect(lerNumeroPtBr("52")).toEqual({ prefixo: "", alvo: 52, casas: 0, sufixo: "" });
  });

  it("lê decimais com vírgula e preserva o sufixo", () => {
    expect(lerNumeroPtBr("3,4 mi")).toEqual({ prefixo: "", alvo: 3.4, casas: 1, sufixo: " mi" });
  });

  it("lê milhares com ponto", () => {
    expect(lerNumeroPtBr("1.234.567")).toMatchObject({ alvo: 1234567, casas: 0 });
  });

  it("preserva prefixo e percentual", () => {
    expect(lerNumeroPtBr("+12,5%")).toEqual({ prefixo: "+", alvo: 12.5, casas: 1, sufixo: "%" });
  });

  it("devolve null para texto sem número (X, –, vazio)", () => {
    expect(lerNumeroPtBr("X")).toBeNull();
    expect(lerNumeroPtBr("–")).toBeNull();
    expect(lerNumeroPtBr("")).toBeNull();
  });
});

describe("formatarNumeroPtBr", () => {
  it("interpola mantendo casas, prefixo e sufixo", () => {
    const leitura = lerNumeroPtBr("3,4 mi")!;
    expect(formatarNumeroPtBr(leitura, 0)).toBe("0,0 mi");
    expect(formatarNumeroPtBr(leitura, 1)).toBe("3,4 mi");
  });

  it("agrupa milhares em pt-BR", () => {
    expect(formatarNumeroPtBr(lerNumeroPtBr("1.234")!, 1)).toBe("1.234");
  });
});

describe("easeOutCubic", () => {
  it("vai de 0 a 1 e desacelera", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("detecção do ambiente", () => {
  it("sem matchMedia (jsdom) não considera movimento reduzido", () => {
    expect(reducaoDeMovimento()).toBe(false);
  });

  it("lê prefers-reduced-motion", () => {
    definirMovimentoReduzido(true);
    expect(reducaoDeMovimento()).toBe(true);
    definirMovimentoReduzido(false);
    expect(reducaoDeMovimento()).toBe(false);
  });

  it("detecta a presença do IntersectionObserver", () => {
    expect(temObserver()).toBe(false);
    instalarObserverFalso();
    expect(temObserver()).toBe(true);
  });
});

describe("SCRIPT_JS_OK", () => {
  it("marca o <html> com js-ok", () => {
    document.documentElement.classList.remove("js-ok");
    new Function(SCRIPT_JS_OK)();
    expect(document.documentElement.classList.contains("js-ok")).toBe(true);
    document.documentElement.classList.remove("js-ok");
  });
});
```

- [ ] **Step 2: Criar os helpers de teste**

Criar `src/test/mock-observer.ts`:

```ts
import { act } from "@testing-library/react";
import { vi } from "vitest";

export interface Instancia {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
}

/** Instala um IntersectionObserver falso; `disparar()` simula o elemento entrando na tela. */
export function instalarObserverFalso() {
  const instancias: Instancia[] = [];
  class FalsoObserver {
    private dados: Instancia;
    constructor(callback: IntersectionObserverCallback) {
      this.dados = { callback, disconnect: vi.fn() };
      instancias.push(this.dados);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      this.dados.disconnect();
    }
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", FalsoObserver);
  return {
    instancias,
    disparar() {
      act(() => {
        instancias.forEach((i) =>
          i.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver),
        );
      });
    },
  };
}

/** Simula a preferência `prefers-reduced-motion: reduce` do visitante. */
export function definirMovimentoReduzido(ativo: boolean) {
  vi.stubGlobal("matchMedia", (consulta: string) => ({
    matches: ativo && consulta.includes("prefers-reduced-motion"),
    media: consulta,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx vitest run src/lib/movimento.test.ts`
Expected: FAIL, "Failed to resolve import ./movimento".

- [ ] **Step 4: Implementar `movimento.ts`**

Criar `src/lib/movimento.ts`:

```ts
/** O visitante pediu menos movimento no sistema operacional. */
export function reducaoDeMovimento(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function temObserver(): boolean {
  return typeof IntersectionObserver !== "undefined";
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface LeituraNumero {
  prefixo: string;
  alvo: number;
  casas: number;
  sufixo: string;
}

/** Separa um número já formatado em pt-BR ("3,4 mi", "1.234", "+12,5%") em prefixo, valor, casas decimais e sufixo. */
export function lerNumeroPtBr(texto: string): LeituraNumero | null {
  const m = /^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(.*)$/s.exec(texto);
  if (!m) return null;
  const inteiro = m[2]!.replaceAll(".", "");
  const decimais = m[3] ?? "";
  return { prefixo: m[1]!, alvo: Number(`${inteiro}.${decimais || "0"}`), casas: decimais.length, sufixo: m[4]! };
}

/** `progresso` vai de 0 a 1; o resultado mantém prefixo, sufixo e número de casas do original. */
export function formatarNumeroPtBr(leitura: LeituraNumero, progresso: number): string {
  const numero = (leitura.alvo * progresso).toLocaleString("pt-BR", {
    minimumFractionDigits: leitura.casas,
    maximumFractionDigits: leitura.casas,
  });
  return `${leitura.prefixo}${numero}${leitura.sufixo}`;
}

/** Script inline do <head>: só com JS a revelação ao rolar esconde conteúdo; sem JS a página aparece inteira. */
export const SCRIPT_JS_OK = `document.documentElement.classList.add("js-ok")`;
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run src/lib/movimento.test.ts`
Expected: PASS.

- [ ] **Step 6: CSS e script no layout**

Em `src/app/globals.css`, logo após o bloco `@media (prefers-reduced-motion: reduce) { ... }` e antes de `.prose-faperon p {`, acrescentar:

```css
/* ---- Movimento sutil: tokens, revelação ao rolar e elevação de cards ---- */
:root {
  --mov-rapido: 150ms;
  --mov-base: 400ms;
  --mov-easing: cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* O estado oculto só vale com JS (a classe js-ok vem de um script no <head>); sem JS a página aparece inteira. */
html.js-ok .revelar {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity var(--mov-base) var(--mov-easing),
    transform var(--mov-base) var(--mov-easing);
}
html.js-ok .revelar.revelar-visivel {
  opacity: 1;
  transform: none;
}

.card-elevar {
  transition:
    transform var(--mov-rapido) var(--mov-easing),
    box-shadow var(--mov-rapido) var(--mov-easing),
    background-color var(--mov-rapido) var(--mov-easing);
}
.card-elevar:hover,
.card-elevar:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -8px rgb(0 0 0 / 0.28);
}

@media (prefers-reduced-motion: reduce) {
  html.js-ok .revelar,
  html.js-ok .revelar.revelar-visivel {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .card-elevar:hover,
  .card-elevar:focus-visible {
    transform: none;
  }
}
```

Em `src/app/layout.tsx`: importar `import { SCRIPT_JS_OK } from "@/lib/movimento";` junto dos outros imports de `@/lib` e, dentro de `<head>`, depois do script do tema, acrescentar:

```tsx
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_JS_OK }} />
```

- [ ] **Step 7: Verificar e commitar**

Run: `npx tsc --noEmit && npx eslint src/lib src/test src/app && npx vitest run`
Expected: tudo passa.

```bash
git add src/lib/movimento.ts src/lib/movimento.test.ts src/test/mock-observer.ts src/app/globals.css src/app/layout.tsx
git commit -m "$(cat <<'EOF'
feat(web): fundação de movimento sutil (tokens, revelação e js-ok)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `useEntrouNaTela` e `<Revelar>`

**Files:**
- Create: `src/components/site/use-entrou-na-tela.ts`
- Create: `src/components/site/revelar.tsx`
- Test: `src/components/site/revelar.test.tsx`

**Interfaces:**
- Consumes: `reducaoDeMovimento`, `temObserver` (Task 1); `instalarObserverFalso`, `definirMovimentoReduzido` (Task 1); `cn` de `@/lib/utils`.
- Produces (usados nas Tasks 3 e 4):
  - `useEntrouNaTela<T extends Element>(margem?: string): { ref: RefObject<T | null>; entrou: boolean }`
  - `<Revelar as?: "div" | "section" | "li" | "ul" | "aside"; indice?: number; ...HTMLAttributes<HTMLElement> />`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/components/site/revelar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { definirMovimentoReduzido, instalarObserverFalso } from "@/test/mock-observer";
import { Revelar } from "./revelar";

afterEach(() => vi.unstubAllGlobals());

describe("Revelar", () => {
  it("mantém o conteúdo oculto até entrar na tela e revela uma única vez", () => {
    const obs = instalarObserverFalso();
    render(<Revelar data-testid="r">Olá</Revelar>);
    const el = screen.getByTestId("r");
    expect(el).toHaveClass("revelar");
    expect(el).not.toHaveClass("revelar-visivel");

    obs.disparar();
    expect(el).toHaveClass("revelar-visivel");
    expect(obs.instancias[0]!.disconnect).toHaveBeenCalled();
  });

  it("revela na hora quando o navegador não tem IntersectionObserver", () => {
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).toHaveClass("revelar-visivel");
  });

  it("revela na hora com movimento reduzido, sem criar observer", () => {
    definirMovimentoReduzido(true);
    const obs = instalarObserverFalso();
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).toHaveClass("revelar-visivel");
    expect(obs.instancias).toHaveLength(0);
  });

  it("escalona 60 ms por item, com teto de 4 itens", () => {
    render(
      <>
        <Revelar data-testid="a" indice={0} />
        <Revelar data-testid="b" indice={2} />
        <Revelar data-testid="c" indice={9} />
      </>,
    );
    expect(screen.getByTestId("a").style.transitionDelay).toBe("");
    expect(screen.getByTestId("b").style.transitionDelay).toBe("120ms");
    expect(screen.getByTestId("c").style.transitionDelay).toBe("180ms");
  });

  it("renderiza a tag pedida e repassa atributos (id, aria, classe)", () => {
    render(
      <Revelar as="section" id="x" aria-labelledby="t" className="mt-4" data-testid="r">
        <h2 id="t">Título</h2>
      </Revelar>,
    );
    const el = screen.getByTestId("r");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveAttribute("id", "x");
    expect(el).toHaveAttribute("aria-labelledby", "t");
    expect(el).toHaveClass("mt-4", "revelar");
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/components/site/revelar.test.tsx`
Expected: FAIL, "Failed to resolve import ./revelar".

- [ ] **Step 3: Implementar o hook**

Criar `src/components/site/use-entrou-na-tela.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { reducaoDeMovimento, temObserver } from "@/lib/movimento";

/**
 * `entrou` vira true uma única vez, quando o elemento aparece na tela. Com movimento reduzido ou sem
 * IntersectionObserver vira true já na montagem, e nenhum observer é criado.
 */
export function useEntrouNaTela<T extends Element>(margem = "0px 0px -8% 0px") {
  const ref = useRef<T>(null);
  const [entrou, setEntrou] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducaoDeMovimento() || !temObserver()) {
      setEntrou(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEntrou(true);
          observer.disconnect();
        }
      },
      { rootMargin: margem },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [margem]);

  return { ref, entrou };
}
```

- [ ] **Step 4: Implementar o componente**

Criar `src/components/site/revelar.tsx`:

```tsx
"use client";

import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useEntrouNaTela } from "./use-entrou-na-tela";

interface RevelarProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "li" | "ul" | "aside";
  /** Posição entre irmãos: cada posição atrasa 60 ms, até o teto de 4 itens, para a revelação nunca parecer lenta. */
  indice?: number;
}

/** Revela o conteúdo com um fade curto ao entrar na tela. Sem JS ou com movimento reduzido ele já aparece normal. */
export function Revelar({ as = "div", indice = 0, className, style, children, ...resto }: RevelarProps) {
  const { ref, entrou } = useEntrouNaTela<HTMLElement>();
  const Elemento = as as ElementType;
  const atraso = Math.min(indice, 3) * 60;
  return (
    <Elemento
      ref={ref}
      className={cn("revelar", entrou && "revelar-visivel", className)}
      style={atraso ? { ...style, transitionDelay: `${atraso}ms` } : style}
      {...resto}
    >
      {children}
    </Elemento>
  );
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run src/components/site/revelar.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 6: Commitar**

```bash
git add src/components/site/use-entrou-na-tela.ts src/components/site/revelar.tsx src/components/site/revelar.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): componente Revelar com fade ao entrar na tela

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `useContador` e `<NumeroAnimado>`

**Files:**
- Create: `src/components/site/use-contador.ts`
- Create: `src/components/site/numero-animado.tsx`
- Test: `src/components/site/numero-animado.test.tsx`

**Interfaces:**
- Consumes: `lerNumeroPtBr`, `formatarNumeroPtBr`, `easeOutCubic`, `reducaoDeMovimento`, `temObserver` (Task 1); `useEntrouNaTela` (Task 2).
- Produces (Task 5): `<NumeroAnimado valor: string; duracao?: number />`. `valor` é o texto já formatado em pt-BR; o componente renderiza o valor final para leitores de tela (`sr-only`) e o número animado com `aria-hidden`.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/components/site/numero-animado.test.tsx`:

```tsx
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { definirMovimentoReduzido, instalarObserverFalso } from "@/test/mock-observer";
import { NumeroAnimado } from "./numero-animado";

afterEach(() => vi.unstubAllGlobals());

function instalarRaf() {
  const fila: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    fila.push(cb);
    return fila.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return {
    quadro(t: number) {
      const atuais = fila.splice(0);
      act(() => atuais.forEach((cb) => cb(t)));
    },
  };
}

const visivel = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]')!.textContent;
const paraLeitor = (c: HTMLElement) => c.querySelector(".sr-only")!.textContent;

describe("NumeroAnimado", () => {
  it("sem IntersectionObserver mostra o valor final", () => {
    const { container } = render(<NumeroAnimado valor="52" />);
    expect(visivel(container)).toBe("52");
    expect(paraLeitor(container)).toBe("52");
  });

  it("com movimento reduzido mostra o valor final e não cria observer", () => {
    definirMovimentoReduzido(true);
    const obs = instalarObserverFalso();
    const { container } = render(<NumeroAnimado valor="52" />);
    expect(visivel(container)).toBe("52");
    expect(obs.instancias).toHaveLength(0);
  });

  it("conta de 0 até o valor ao entrar na tela, e o leitor de tela sempre lê o valor final", () => {
    const obs = instalarObserverFalso();
    const raf = instalarRaf();
    const { container } = render(<NumeroAnimado valor="52" duracao={1000} />);

    expect(visivel(container)).toBe("0");
    expect(paraLeitor(container)).toBe("52");

    obs.disparar();
    raf.quadro(1000); // primeiro quadro: início da contagem
    raf.quadro(1500); // metade do tempo
    const meio = Number(visivel(container));
    expect(meio).toBeGreaterThan(0);
    expect(meio).toBeLessThan(52);
    expect(paraLeitor(container)).toBe("52");

    raf.quadro(2100);
    expect(visivel(container)).toBe("52");
  });

  it("mantém casas decimais e sufixo durante e depois da contagem", () => {
    const obs = instalarObserverFalso();
    const raf = instalarRaf();
    const { container } = render(<NumeroAnimado valor="3,4 mi" duracao={1000} />);
    expect(visivel(container)).toBe("0,0 mi");

    obs.disparar();
    raf.quadro(0);
    raf.quadro(500);
    expect(visivel(container)).toMatch(/^\d,\d mi$/);

    raf.quadro(1500);
    expect(visivel(container)).toBe("3,4 mi");
  });

  it("texto sem número (X, –) aparece como veio e não anima", () => {
    const obs = instalarObserverFalso();
    const { container } = render(<NumeroAnimado valor="–" />);
    expect(visivel(container)).toBe("–");
    obs.disparar();
    expect(visivel(container)).toBe("–");
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/components/site/numero-animado.test.tsx`
Expected: FAIL, "Failed to resolve import ./numero-animado".

- [ ] **Step 3: Implementar o hook**

Criar `src/components/site/use-contador.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { easeOutCubic, formatarNumeroPtBr, lerNumeroPtBr, reducaoDeMovimento, temObserver } from "@/lib/movimento";
import { useEntrouNaTela } from "./use-entrou-na-tela";

const podeAnimar = () => !reducaoDeMovimento() && temObserver();

/**
 * Texto exibido de um número pt-BR já formatado: o valor final até a hidratação (SEO e sem JS), depois 0 e, ao
 * entrar na tela, a contagem até o valor. Texto sem número (X, –) nunca anima.
 */
export function useContador(valor: string, duracao = 1200) {
  const { ref, entrou } = useEntrouNaTela<HTMLSpanElement>();
  const [exibido, setExibido] = useState(valor);

  useEffect(() => {
    const leitura = lerNumeroPtBr(valor);
    if (leitura && podeAnimar()) setExibido(formatarNumeroPtBr(leitura, 0));
  }, [valor]);

  useEffect(() => {
    const leitura = lerNumeroPtBr(valor);
    if (!entrou || !leitura || !podeAnimar()) return;
    let quadro = 0;
    let inicio: number | null = null;
    const passo = (agora: number) => {
      inicio ??= agora;
      const p = Math.min(1, (agora - inicio) / duracao);
      setExibido(p >= 1 ? valor : formatarNumeroPtBr(leitura, easeOutCubic(p)));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [entrou, valor, duracao]);

  return { ref, exibido };
}
```

- [ ] **Step 4: Implementar o componente**

Criar `src/components/site/numero-animado.tsx`:

```tsx
"use client";

import { useContador } from "./use-contador";

/** Número que conta de 0 até o valor ao entrar na tela. O valor final fica no HTML para leitores de tela. */
export function NumeroAnimado({ valor, duracao }: { valor: string; duracao?: number }) {
  const { ref, exibido } = useContador(valor, duracao);
  return (
    <>
      <span className="sr-only">{valor}</span>
      <span ref={ref} aria-hidden="true">
        {exibido}
      </span>
    </>
  );
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run src/components/site/numero-animado.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 6: Commitar**

```bash
git add src/components/site/use-contador.ts src/components/site/numero-animado.tsx src/components/site/numero-animado.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): contador animado de números com valor final para leitores de tela

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Aplicar `<Revelar>` nas páginas e cobrir com e2e

**Files:**
- Modify: `src/app/page.tsx`, `src/app/central-de-inteligencia/page.tsx`, `src/app/sobre/page.tsx`, `src/app/sindicatos-rurais/page.tsx`, `src/app/ipagro/page.tsx`, `src/app/comissao-mulheres/page.tsx`, `src/app/informativos-tecnicos/page.tsx`
- Create: `e2e/animacoes.spec.ts`

**Interfaces:**
- Consumes: `<Revelar as indice ...>` (Task 2).

Regra de edição: nas seções **abaixo da dobra**, trocar `<section ...>` por `<Revelar as="section" ...>` e `</section>` por `</Revelar>`, mantendo todos os atributos (`id`, `aria-labelledby`, `className`). Não envolver: o hero (carrossel e `HeroPagina`), o ticker de notícias, a `FaixaNumeros`, a seção em gradiente da Central (`central-titulo`, que está acima da dobra) e o `CtaDuplo`. Em cada arquivo adicionar `import { Revelar } from "@/components/site/revelar";` junto dos imports de `@/components`.

- [ ] **Step 1: Escrever o e2e (falha antes das edições)**

Criar `e2e/animacoes.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("seções abaixo da dobra são reveladas ao rolar", async ({ page }) => {
  await page.goto("/sobre");
  const secao = page.locator("#diretoria");
  await expect(secao).toHaveClass(/revelar/);
  await secao.scrollIntoViewIfNeeded();
  await expect(secao).toHaveClass(/revelar-visivel/);
  await expect(secao).toHaveCSS("opacity", "1");
});

test("com movimento reduzido tudo aparece sem rolar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sobre");
  await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
});

test("link direto para uma âncora revela a seção de destino", async ({ page }) => {
  await page.goto("/sobre#estatuto");
  await expect(page.locator("#estatuto")).toHaveClass(/revelar-visivel/);
  await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("o conteúdo continua visível", async ({ page }) => {
    await page.goto("/sobre");
    await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
    await expect(page.locator("#diretoria")).toHaveCSS("opacity", "1");
  });
});
```

- [ ] **Step 2: Editar as páginas**

Seções a envolver (números de linha aproximados, de antes das edições; confirme pelo `aria-labelledby`/`id`):

- `src/app/page.tsx`: `sistema-titulo` (`relative mt-10 overflow-hidden …`), `commodities.titulo` (`aria-label`), `senar-titulo`, `noticias-titulo`, `central-titulo` (faixa escura `bg-brand-dark`), `nosso-agro-titulo`. Além disso:
  - nos `<li key={e.nome} className="flex">` dos cartões do sistema, usar `<Revelar as="li" indice={i} key={e.nome} className="flex">` (acrescentar `i` ao `.map((e, i) => …)`);
  - nos `<li key={n.slug}>` das notícias recentes, usar `<Revelar as="li" indice={i} key={n.slug}>` (acrescentar `i` ao `.map((n, i) => …)`).
- `src/app/central-de-inteligencia/page.tsx`: as duas seções `container mt-12` (linhas ~33 e ~57). A do hero em gradiente (linha ~18) fica como está.
- `src/app/sobre/page.tsx`: `quem-somos`, `missao-visao-valores`, `diretoria`, `estatuto`, `sistema` (todas com `id`).
- `src/app/sindicatos-rurais/page.tsx`: `lista-titulo` e `acao-titulo`.
- `src/app/ipagro/page.tsx`: `ficha-titulo`, `diagnostico-titulo`, `transparencia-titulo`.
- `src/app/comissao-mulheres/page.tsx`: `atuacao-titulo`, `lideranca-titulo`, `nacional-titulo`, `linha-titulo`.
- `src/app/informativos-tecnicos/page.tsx`: `ultimas-titulo`, `arquivo-titulo` (`id="arquivo"`), `boletins-titulo` (`id="boletins"`).

Exemplo, `sobre/page.tsx`:

```tsx
// antes
<section id="diretoria" aria-labelledby="diretoria-titulo" className="scroll-mt-32 pt-16">
  …
</section>

// depois
<Revelar as="section" id="diretoria" aria-labelledby="diretoria-titulo" className="scroll-mt-32 pt-16">
  …
</Revelar>
```

- [ ] **Step 3: Verificar tipos, lint e testes unitários**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run`
Expected: tudo passa, sem alterar nenhuma expectativa de teste existente.

- [ ] **Step 4: Rodar o e2e novo e a suíte e2e completa**

Run: `npx playwright test e2e/animacoes.spec.ts`
Expected: PASS (4 testes). Em seguida `npx playwright test`; expected: PASS, incluindo axe em `fluxo.spec.ts` (esse teste já usa `reducedMotion: "reduce"`).

- [ ] **Step 5: Commitar**

```bash
git add src/app e2e/animacoes.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): revelação ao rolar nas seções das páginas do site

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Contadores nos números do Início, de Sobre e dos Informativos

**Files:**
- Modify: `src/components/site/faixa-numeros.tsx`
- Modify: `src/app/page.tsx`, `src/app/sobre/page.tsx`, `src/app/informativos-tecnicos/page.tsx`
- Test: `src/components/site/faixa-numeros.test.tsx` (novo)

**Interfaces:**
- Consumes: `<NumeroAnimado valor />` (Task 3).
- Produces: `Numero` ganha o campo opcional `animar?: boolean` (padrão `false`, para que anos como "1983" nunca contem de 0).

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/components/site/faixa-numeros.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaixaNumeros } from "./faixa-numeros";

describe("FaixaNumeros", () => {
  it("mostra rótulo, valor e detalhe de cada número", () => {
    render(
      <FaixaNumeros
        rotulo="A FAPERON em números"
        itens={[
          { rotulo: "Fundação", valor: "1983", detalhe: "mais de 40 anos" },
          { rotulo: "Municípios", valor: "52", detalhe: "em todo o estado", animar: true },
        ]}
      />,
    );
    expect(screen.getByRole("region", { name: "A FAPERON em números" })).toBeInTheDocument();
    expect(screen.getByText("1983")).toBeInTheDocument();
    expect(screen.getAllByText("52").length).toBeGreaterThan(0);
    expect(screen.getByText("em todo o estado")).toBeInTheDocument();
  });

  it("só anima os itens marcados com animar (um ano nunca conta de 0)", () => {
    const { container } = render(
      <FaixaNumeros
        rotulo="Números"
        itens={[
          { rotulo: "Fundação", valor: "1983", detalhe: "x" },
          { rotulo: "Municípios", valor: "52", detalhe: "y", animar: true },
        ]}
      />,
    );
    expect(container.querySelectorAll(".sr-only")).toHaveLength(1); // só o item animado tem a cópia para leitores de tela
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/components/site/faixa-numeros.test.tsx`
Expected: FAIL (o segundo teste, pois `animar` ainda não existe).

- [ ] **Step 3: Implementar**

Em `src/components/site/faixa-numeros.tsx`, importar `NumeroAnimado` (`import { NumeroAnimado } from "./numero-animado";`), acrescentar `animar?: boolean;` à interface `Numero` e trocar o `<dd>` do valor por:

```tsx
            <dd className="mt-2 text-[clamp(1.7rem,3vw,2.4rem)] font-semibold leading-none tracking-tight tabular-nums text-brand-fg">
              {n.animar ? <NumeroAnimado valor={n.valor} /> : n.valor}
            </dd>
```

Em `src/app/sobre/page.tsx`, marcar `animar: true` nos itens "Sindicatos rurais" e "Municípios" (não em "Fundação", que é um ano).

Em `src/app/informativos-tecnicos/page.tsx`, marcar `animar: true` nos três itens (são contagens).

Em `src/app/page.tsx`, importar `NumeroAnimado` e trocar:
- no bloco "Sistema" (`SOBRE.quem_somos.numeros.slice(1)`): `<p className="text-3xl font-bold tabular-nums text-brand-fg">{n.valor}</p>` → `…><NumeroAnimado valor={n.valor} /></p>`;
- no bloco "Nosso agro": `<p className="text-3xl font-semibold tracking-tight text-brand-fg tabular-nums md:text-4xl">{n.valor}</p>` → `…><NumeroAnimado valor={n.valor} /></p>`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run`
Expected: tudo passa.

- [ ] **Step 5: Commitar**

```bash
git add src/components/site/faixa-numeros.tsx src/components/site/faixa-numeros.test.tsx src/app
git commit -m "$(cat <<'EOF'
feat(web): contadores animados nos números do Início, Sobre e Informativos

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Micro-interações (cards, setas, botões, imagens de notícia)

**Files:**
- Modify: `src/components/ui/button.tsx`, `src/components/inicio/noticia-chamada.tsx`, `src/app/page.tsx`, `src/app/sobre/page.tsx`, `src/app/ipagro/page.tsx`

Só CSS; a regra global de `prefers-reduced-motion` já zera as transições. Sem testes novos (não há lógica); a verificação é lint, testes existentes e a captura de tela da Task 8.

- [ ] **Step 1: Botões com feedback de pressionar**

Em `src/components/ui/button.tsx`, na string base do `cva`, trocar `transition-colors` por `transition duration-150 active:scale-[0.98]`:

```tsx
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
```

- [ ] **Step 2: Elevação nos cards clicáveis**

- `src/app/page.tsx`, `LinkAuto` dos cartões do sistema: trocar `transition-colors` por `card-elevar` e remover `motion-reduce:transition-none` (o CSS global cobre o movimento reduzido):

```tsx
className="group flex w-full flex-col overflow-hidden rounded-2xl bg-brand-dark p-5 text-white card-elevar hover:bg-brand md:min-h-[19rem]"
```

- `src/app/sobre/page.tsx`: acrescentar `card-elevar` ao `className` do `LinkAuto` do bloco "Sistema FAPERON" (`… p-5 hover:bg-surface-alt` → `… p-5 card-elevar hover:bg-surface-alt`) e ao link do estatuto (`… px-6 py-5 hover:bg-steel-soft` → `… px-6 py-5 card-elevar hover:bg-steel-soft`).

- [ ] **Step 3: Seta que desliza e zoom discreto na imagem**

- `src/app/ipagro/page.tsx`: no link do portal de transparência acrescentar `group` ao `className` do `<a>` e trocar a seta por:

```tsx
<ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
```

- `src/components/inicio/noticia-chamada.tsx`: na `Image` da notícia, `className="object-cover"` → `className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"` (o contêiner já tem `overflow-hidden` e o link já tem `group`).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run`
Expected: tudo passa.

- [ ] **Step 5: Commitar**

```bash
git add src
git commit -m "$(cat <<'EOF'
feat(web): micro-interações em botões, cards, setas e imagens de notícia

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Painel — entrada curta nos gráficos e skeleton dos cartões

**Files:**
- Modify: `src/lib/chart-options.ts`, `src/lib/chart-options.test.ts`
- Modify: `src/components/painel/grafico.tsx`
- Modify: `src/components/painel/numeros.tsx`

**Interfaces:**
- Consumes: `reducaoDeMovimento` (Task 1).
- Produces: `comEntrada(option: EChartsCoreOption, animar: boolean): EChartsCoreOption`.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/lib/chart-options.test.ts`, trocar o import por `import { comEntrada, comTemaEscuro, opcaoComparacao, opcaoSerie, PALETA_ESCURA } from "./chart-options";` e acrescentar no fim do arquivo:

```ts
describe("comEntrada", () => {
  it("liga a animação curta de entrada sem alterar o resto da opção", () => {
    const o = comEntrada({ color: ["#000"], series: [] }, true) as Record<string, unknown>;
    expect(o).toMatchObject({ color: ["#000"], series: [], animation: true, animationDuration: 400, animationEasing: "cubicOut" });
  });

  it("desliga a animação quando não é a primeira renderização ou há movimento reduzido", () => {
    expect((comEntrada({ series: [] }, false) as { animation: boolean }).animation).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/lib/chart-options.test.ts`
Expected: FAIL (`comEntrada` não existe).

- [ ] **Step 3: Implementar `comEntrada`**

Em `src/lib/chart-options.ts`, acrescentar ao final do arquivo:

```ts
/** Entrada curta só quando `animar`; filtros e troca de tema reaplicam a opção sem animar, para responder na hora. */
export function comEntrada(option: EChartsCoreOption, animar: boolean): EChartsCoreOption {
  return { ...option, animation: animar, animationDuration: 400, animationEasing: "cubicOut" };
}
```

- [ ] **Step 4: Usar no `Grafico` (anima só na primeira renderização)**

Em `src/components/painel/grafico.tsx`: importar `comEntrada` junto de `comTemaEscuro` (`import { comEntrada, comTemaEscuro } from "@/lib/chart-options";`) e `reducaoDeMovimento` (`import { reducaoDeMovimento } from "@/lib/movimento";`); criar `const desenhou = useRef(false);` ao lado dos outros `useRef`; e trocar o último `useEffect` por:

```tsx
  useEffect(() => {
    const base = escuro ? comTemaEscuro(option) : option;
    // Só a primeira renderização anima; filtros e troca de tema reaplicam a opção na hora.
    chart.current?.setOption(comEntrada(base, !desenhou.current && !reducaoDeMovimento()), true);
    desenhou.current = true;
  }, [option, escuro]);
```

- [ ] **Step 5: Skeleton dos cartões de números**

Em `src/components/painel/numeros.tsx`: trocar o import `import { Carregando, Secao } from "./comuns";` por `import { Secao } from "./comuns";` (confirmar com o lint que `Carregando` não é usado em outro ponto do arquivo; se for, manter) e importar `import { Skeleton } from "@/components/ui/feedback";`. Substituir o retorno do estado pendente por:

```tsx
  if (ranking.isPending || serie.isPending) {
    return (
      <Secao id="numeros" etiqueta="Números do recorte" titulo="Carregando os números…">
        <div role="status" aria-live="polite">
          <span className="sr-only">Carregando números do recorte…</span>
          <ul aria-hidden="true" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton className="h-40 w-full rounded-2xl" />
              </li>
            ))}
          </ul>
        </div>
      </Secao>
    );
  }
```

Ajustar a altura `h-40` (10rem) à do `Cartao` real: abrir o Painel com a API mock (`npm run mock` e `npm run dev`), medir com o DevTools (ou `page.getByTestId("cartao-numero").first().boundingBox()`) o cartão de maior altura no desktop e usar essa altura no skeleton, para a seção não saltar quando os dados chegarem.

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run && npx playwright test`
Expected: tudo passa (os e2e do Painel seguem com `svg` visível).

- [ ] **Step 7: Commitar**

```bash
git add src
git commit -m "$(cat <<'EOF'
feat(web): entrada curta nos gráficos e skeleton dos cartões do Painel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Verificação final, ADR e publicação na demo

**Files:**
- Create: `docs/adr/0026-animacoes-sutis-com-css-e-intersectionobserver.md`

Esta etapa é de verificação e auditoria (rodar em **Opus**, conforme as regras do projeto).

- [ ] **Step 1: Suíte completa**

Run (em `apps/web`): `npx tsc --noEmit && npx eslint . && npx vitest run && npx playwright test && npm run build`
Expected: tudo passa. Se algo falhar, **corrigir a causa** (não afrouxar o teste) antes de seguir.

- [ ] **Step 2: Conferir que não entrou dependência nova**

Run (na raiz): `git diff 97a1629 -- apps/web/package.json apps/web/package-lock.json`
Expected: sem saída.

- [ ] **Step 3: Verificação visual**

Subir `npm run mock` e `npm run dev` e, com o navegador, capturar Início, Sobre e Painel em desktop e celular (390 px), nos temas claro e escuro. Conferir: conteúdo acima da dobra sem piscar, seções revelando ao rolar, contadores terminando no valor certo, cartões sem salto de layout, e que filtros do Painel respondem sem reanimar os gráficos. Repetir com `prefers-reduced-motion` ligado: nada se move.

- [ ] **Step 4: Registrar o ADR**

Ler `docs/adr/0025-gunicorn-com-threads-e-renderizacao-de-pdf-serializada-com-espera-.md` e `docs/adr/README.md` e seguir o mesmo formato (MADR). Criar `docs/adr/0026-animacoes-sutis-com-css-e-intersectionobserver.md` registrando: contexto (site institucional, intensidade sutil), decisão (CSS + hook de `IntersectionObserver`, `js-ok`, sem biblioteca), alternativas descartadas (Framer Motion pelo peso e superfície de teste; View Transitions API/scroll-driven animations pelo suporte irregular) e consequências (revelação depende do JS; sem JS ou com movimento reduzido tudo aparece). Acrescentar a linha correspondente na lista do `docs/adr/README.md`, se ele mantiver um índice.

- [ ] **Step 5: Commitar e publicar na demo**

```bash
git add docs/adr
git commit -m "$(cat <<'EOF'
docs(adr): registra animações sutis com CSS e IntersectionObserver

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
docker compose up -d --build web
tailscale funnel status
```

Conferir o link público (status HTTP das páginas principais e uma captura de tela), seguindo a regra permanente do projeto de publicar na demo do Tailscale depois de mudança visual, sem derrubar os outros apps expostos pelo Funnel. Informar a URL ao usuário.
