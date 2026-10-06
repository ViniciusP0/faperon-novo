import { act } from "@testing-library/react";
import { vi } from "vitest";

export interface Instancia {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
}

/** Posição vertical (px a partir do topo da janela) que todo elemento reporta; o jsdom não tem layout. */
export function definirTopoDosElementos(top: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
}

/**
 * Instala um IntersectionObserver falso; `disparar()` simula o elemento entrando na tela. Por padrão os elementos
 * ficam bem abaixo da dobra (a revelação só se aplica a eles); use `definirTopoDosElementos` para mudar isso.
 * Os testes devem chamar `vi.unstubAllGlobals()` e `vi.restoreAllMocks()` ao terminar.
 */
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
  definirTopoDosElementos(10_000);
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
