import { describe, expect, it } from "vitest";
import { formatQuantidadePorExtenso, formatReais, formatReaisPorExtenso, formatoPorUnidade } from "./format";

describe("formatReaisPorExtenso (entrada em mil R$): sem sigla, 1.000 = mil, 1.000.000 = milhão", () => {
  it.each([
    [0, "R$ 0"],
    [0.5, "R$ 500"], // 0,5 mil R$ = R$ 500
    [850, "R$ 850 mil"],
    [12.3, "R$ 12,3 mil"], // 12,3 mil R$ = R$ 12.300
    [1000, "R$ 1 milhão"],
    [1500, "R$ 1,5 milhão"],
    [2000, "R$ 2 milhões"],
    [44_904, "R$ 44,9 milhões"],
    [1_112_550, "R$ 1,1 bilhão"],
    [2_275_262, "R$ 2,3 bilhões"],
    [12_935_713, "R$ 12,9 bilhões"],
  ])("%s mil R$ → %s", (entrada, esperado) => {
    expect(formatReaisPorExtenso(entrada)).toBe(esperado);
  });

  it("o arredondamento sobe de escala em vez de escrever 1.000 mil", () => {
    expect(formatReaisPorExtenso(999.96)).toBe("R$ 1 milhão"); // R$ 999.960
    expect(formatReaisPorExtenso(999_960)).toBe("R$ 1 bilhão"); // R$ 999.960.000
  });

  it("valores negativos mantêm o sinal", () => {
    expect(formatReaisPorExtenso(-1500)).toBe("-R$ 1,5 milhão");
  });
});

describe("formatReais (entrada em mil R$): o valor completo, sem arredondar", () => {
  it("mostra os reais inteiros com separador de milhar", () => {
    expect(formatReais(1_112_550)).toBe("R$ 1.112.550.000");
    expect(formatReais(44_904)).toBe("R$ 44.904.000");
    expect(formatReais(0.5)).toBe("R$ 500");
  });
});

describe("formatQuantidadePorExtenso", () => {
  const ha = { singular: "hectare", plural: "hectares" };
  it.each([
    [1, "1 hectare"],
    [850, "850 hectares"],
    [12_345, "12,3 mil hectares"],
    [1_000_000, "1 milhão de hectares"],
    [1_380_662, "1,4 milhão de hectares"],
    [2_500_000, "2,5 milhões de hectares"],
  ])("%s → %s", (n, esperado) => {
    expect(formatQuantidadePorExtenso(n, ha)).toBe(esperado);
  });

  it("cabeças de gado", () => {
    expect(formatQuantidadePorExtenso(17_089_633, { singular: "cabeça", plural: "cabeças" })).toBe("17,1 milhões de cabeças");
  });
});

describe("formatoPorUnidade: o mesmo vocabulário no balão do mapa e no eixo do gráfico ao lado", () => {
  it("em mil R$, a escala do eixo acompanha o maior valor", () => {
    const bi = formatoPorUnidade("Mil Reais", 2_408_218)!; // R$ 2,4 bilhões
    expect(bi.nomeEixo).toBe("R$ bilhões");
    expect(bi.eixo(1_500_000)).toBe("1,5");
    expect(bi.valor(2_408_218)).toBe("R$ 2,4 bilhões");

    const mi = formatoPorUnidade("Mil Reais", 800_000)!; // R$ 800 milhões
    expect(mi.nomeEixo).toBe("R$ milhões");
    expect(mi.eixo(500_000)).toBe("500");

    const mil = formatoPorUnidade("Mil Reais", 400)!; // R$ 400 mil
    expect(mil.nomeEixo).toBe("R$ mil");
    expect(mil.eixo(250)).toBe("250");
  });

  it("hectares e cabeças", () => {
    const ha = formatoPorUnidade("Hectares", 1_380_662)!;
    expect(ha.nomeEixo).toBe("milhões de hectares");
    expect(ha.eixo(500_000)).toBe("0,5");
    expect(ha.valor(1_380_662)).toBe("1,4 milhão de hectares");
    expect(formatoPorUnidade("Hectares", 8_000)!.nomeEixo).toBe("mil hectares");

    const cab = formatoPorUnidade("Cabeças", 120_000)!;
    expect(cab.nomeEixo).toBe("mil cabeças");
    expect(cab.valor(120_000)).toBe("120 mil cabeças");
  });

  it("sem unidade conhecida não inventa escala: devolve null", () => {
    expect(formatoPorUnidade("", 10)).toBeNull();
    expect(formatoPorUnidade("Toneladas", 10)).toBeNull();
  });
});
