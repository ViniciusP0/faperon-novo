import { afterEach, describe, expect, it, vi } from "vitest";
import { definirMovimentoReduzido, instalarObserverFalso } from "@/test/mock-observer";
import {
  easeOutCubic,
  formatarNumeroPtBr,
  lerNumeroPtBr,
  reducaoDeMovimento,
  temObserver,
} from "./movimento";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
