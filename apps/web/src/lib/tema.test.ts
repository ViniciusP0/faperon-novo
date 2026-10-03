import { afterEach, describe, expect, it } from "vitest";
import { aplicarTema, CHAVE_TEMA, SCRIPT_TEMA, salvarTema, temaAtual } from "./tema";

afterEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
});

describe("tema", () => {
  it("aplica e lê o tema pelo atributo do <html>", () => {
    aplicarTema("escuro");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(temaAtual()).toBe("escuro");
    aplicarTema("claro");
    expect(temaAtual()).toBe("claro");
  });

  it("guarda a escolha e o script do <head> a reaplica", () => {
    salvarTema("escuro");
    expect(localStorage.getItem(CHAVE_TEMA)).toBe("escuro");
    new Function(SCRIPT_TEMA)();
    expect(temaAtual()).toBe("escuro");
  });

  it("sem escolha guardada, o script mantém o tema claro", () => {
    new Function(SCRIPT_TEMA)();
    expect(temaAtual()).toBe("claro");
  });
});
