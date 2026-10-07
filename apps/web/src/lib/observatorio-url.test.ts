import { describe, expect, it } from "vitest";
import { comFiltro, parametrosDoBloco, semFiltrosDoBloco } from "./observatorio-url";

describe("filtros do Observatório na URL", () => {
  const sp = new URLSearchParams("pan_ano=2024&pan_janela=5&cre_cultura=soja-em-grao&utm=x");

  it("lê só os parâmetros do bloco, sem o prefixo", () => {
    expect(parametrosDoBloco(sp, "panorama").toString()).toBe("ano=2024&janela=5");
    expect(parametrosDoBloco(sp, "crescimento").toString()).toBe("cultura=soja-em-grao");
    expect(parametrosDoBloco(sp, "territorio").toString()).toBe("");
  });

  it("grava e remove um filtro sem mexer nos outros blocos", () => {
    const novo = comFiltro(sp, "crescimento", "inicio", "2015");
    expect(novo.get("cre_inicio")).toBe("2015");
    expect(novo.get("pan_ano")).toBe("2024");
    expect(comFiltro(novo, "crescimento", "inicio", null).has("cre_inicio")).toBe(false);
    expect(sp.has("cre_inicio")).toBe(false); // não muta a entrada
  });

  it("volta ao padrão de um bloco só", () => {
    const limpo = semFiltrosDoBloco(sp, "panorama");
    expect(limpo.toString()).toBe("cre_cultura=soja-em-grao&utm=x");
  });
});
