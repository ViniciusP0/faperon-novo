import { describe, expect, it } from "vitest";
import { formatBilhoesEixo, formatMilLitros, formatMilReais } from "./format";

describe("formatMilReais (entrada em mil R$)", () => {
  it("escreve a unidade por extenso para não parecer 1000 vezes menor", () => {
    expect(formatMilReais(14_465_314)).toBe("R$ 14,5 bi");
    expect(formatMilReais(12_935_713)).toBe("R$ 12,9 bi");
    expect(formatMilReais(1_251_099)).toBe("R$ 1,3 bi");
    expect(formatMilReais(850_000)).toBe("R$ 850 mi");
    expect(formatMilReais(1_500)).toBe("R$ 1,5 mi");
    expect(formatMilReais(12)).toBe("R$ 12 mil");
    expect(formatMilReais(0)).toBe("R$ 0");
  });

  it("não deixa 999,96 mi virar '1.000 mi'", () => {
    expect(formatMilReais(999_960)).toBe("R$ 1 bi");
  });

  it("negativo leva o sinal à frente", () => {
    expect(formatMilReais(-2_500_000)).toBe("-R$ 2,5 bi");
  });
});

describe("formatMilLitros (entrada em mil litros)", () => {
  it("converte para milhões de litros", () => {
    expect(formatMilLitros(583_715)).toBe("583,7 milhões de litros");
    expect(formatMilLitros(1_000)).toBe("1 milhão de litros");
    expect(formatMilLitros(2_000)).toBe("2 milhões de litros");
    expect(formatMilLitros(850)).toBe("850 mil litros");
    expect(formatMilLitros(1_200_000)).toBe("1,2 bilhão de litros");
  });
});

describe("formatBilhoesEixo (eixo em mil R$)", () => {
  it("mostra bilhões com vírgula", () => {
    expect(formatBilhoesEixo(15_000_000)).toBe("15");
    expect(formatBilhoesEixo(2_500_000)).toBe("2,5");
    expect(formatBilhoesEixo(0)).toBe("0");
  });
});
