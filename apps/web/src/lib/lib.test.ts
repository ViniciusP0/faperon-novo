import { describe, expect, it } from "vitest";
import { descreverSerie } from "./descricao";
import { normalizar, parseFiltros, recorteParams, serializeFiltros } from "./filters";
import { formatData, formatPercentual, formatValor } from "./format";

describe("formatValor", () => {
  it("mostra X para sigiloso e traço para inexistente, nunca zero", () => {
    expect(formatValor(null, "sigiloso")).toBe("X");
    expect(formatValor(null, "inexistente")).toBe("–");
  });

  it("usa separador de milhar pt-BR", () => {
    expect(formatValor(1234567, "ok")).toBe("1.234.567");
    expect(formatValor(0, "ok")).toBe("0");
    expect(formatValor(12.345, "ok")).toBe("12,35");
  });
});

describe("formatPercentual e formatData", () => {
  it("formata com vírgula decimal", () => {
    expect(formatPercentual(14.87, 2)).toBe("14,87%");
    expect(formatPercentual(null)).toBe("–");
  });

  it("formata data ISO sem deslocar o dia por fuso", () => {
    expect(formatData("2026-09-18")).toContain("18");
  });
});

describe("filtros na URL", () => {
  it("é reversível: parse(serialize(f)) reproduz a consulta", () => {
    const original = parseFiltros(
      new URLSearchParams("segmento=agricultura&produto=soja-em-grao&indicador=quantidade-produzida&inicio=2015&fim=2024&aba=comparacao&municipios=1100015,1100023"),
    );
    const volta = parseFiltros(serializeFiltros(original));
    expect(volta).toEqual(original);
    expect(volta.municipios).toEqual(["1100015", "1100023"]);
    expect(volta.aba).toBe("comparacao");
  });

  it("aba desconhecida cai em ranking e ano inválido vira null", () => {
    const f = parseFiltros(new URLSearchParams("aba=xyz&inicio=abc"));
    expect(f.aba).toBe("ranking");
    expect(f.inicio).toBeNull();
  });

  it("limita a comparação a 5 itens", () => {
    const f = parseFiltros(new URLSearchParams("municipios=1,2,3,4,5,6,7"));
    expect(f.municipios).toHaveLength(5);
  });

  it("recorteParams omite período ausente", () => {
    const p = recorteParams({ produto: "leite", indicador: "efetivo", inicio: null, fim: 2024 });
    expect(p.toString()).toBe("produto=leite&indicador=efetivo&fim=2024");
  });

  it("normaliza acentos para busca de produto", () => {
    expect(normalizar("Café (em grão)")).toBe("cafe (em grao)");
  });
});

describe("descreverSerie", () => {
  it("descreve início, fim, extremos e variação", () => {
    const texto = descreverSerie(
      "Rondônia (total)",
      [
        { ano: 2020, valor: 100, status: "ok" },
        { ano: 2021, valor: 150, status: "ok" },
        { ano: 2022, valor: 120, status: "ok" },
      ],
      "Toneladas",
    );
    expect(texto).toContain("de 2020 a 2022");
    expect(texto).toContain("+20,0%");
    expect(texto).toContain("Maior valor em 2021: 150");
    expect(texto).toContain("Menor valor em 2020: 100");
  });

  it("avisa quando não há valores e conta anos sem dado", () => {
    expect(descreverSerie("X", [{ ano: 2020, valor: null, status: "sigiloso" }], "ha")).toMatch(/Não há valores/);
    const parcial = descreverSerie(
      "X",
      [
        { ano: 2020, valor: 5, status: "ok" },
        { ano: 2021, valor: null, status: "sigiloso" },
      ],
      "ha",
    );
    expect(parcial).toContain("1 ano(s) sem valor");
  });
});
