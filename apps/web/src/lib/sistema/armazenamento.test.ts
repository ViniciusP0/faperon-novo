import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apagarTudo, ARMAZENAMENTO_CHEIO, gravar, gravarSessao, ler, lerSessao } from "./armazenamento";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("armazenamento do protótipo", () => {
  it("grava e lê JSON com prefixo sistema:", () => {
    gravar("frota", { a: 1 });
    expect(window.localStorage.getItem("sistema:frota")).toBe('{"a":1}');
    expect(ler("frota", null)).toEqual({ a: 1 });
  });

  it("devolve o padrão quando não há nada ou o JSON é inválido", () => {
    expect(ler("nada", [1])).toEqual([1]);
    window.localStorage.setItem("sistema:quebrado", "{");
    expect(ler("quebrado", "padrao")).toBe("padrao");
  });

  it("com o storage bloqueado, guarda em memória durante a página", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    gravar("agenda:f1", ["evento"]);
    expect(ler("agenda:f1", [])).toEqual(["evento"]);
    gravarSessao("f2");
    expect(lerSessao()).toBe("f2");
  });

  it("a sessão fica no sessionStorage e apagarTudo limpa só as chaves do sistema", () => {
    gravarSessao("f1");
    expect(window.sessionStorage.getItem("sistema:sessao")).toBe("f1");
    gravar("frota", {});
    window.localStorage.setItem("faperon-tema", "escuro");
    apagarTudo();
    expect(window.localStorage.getItem("sistema:frota")).toBeNull();
    expect(window.localStorage.getItem("faperon-tema")).toBe("escuro");
    expect(lerSessao()).toBe("f1");
    gravarSessao(null);
    expect(lerSessao()).toBeNull();
  });

  it("dado com formato errado volta ao padrão; com a cota cheia, vale o que ficou na memória e a barra é avisada", () => {
    window.localStorage.setItem("sistema:frota", JSON.stringify({ veiculos: [] }));
    expect(ler("frota", { veiculos: [], reservas: [] })).toEqual({ veiculos: [], reservas: [] });
    window.localStorage.setItem("sistema:lista", "null");
    expect(ler("lista", [1])).toEqual([1]);

    gravar("contas", ["antigo"]);
    const avisos: Event[] = [];
    window.addEventListener(ARMAZENAMENTO_CHEIO, (e) => avisos.push(e));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("cheio", "QuotaExceededError");
    };
    try {
      gravar("contas", ["novo"]);
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(ler("contas", [] as string[])).toEqual(["novo"]);
    expect(avisos).toHaveLength(1);
    gravar("contas", ["coube"]);
    expect(window.localStorage.getItem("sistema:contas")).toBe(JSON.stringify(["coube"]));
  });
});
