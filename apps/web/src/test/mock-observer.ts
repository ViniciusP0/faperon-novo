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
