import { describe, expect, it } from "vitest";
import type { Ponto } from "./api-types";
import { descreverTendencia, pontosDaTendencia, tendenciaLinear } from "./tendencia";

const ponto = (ano: number, valor: number | null, status: Ponto["status"] = "ok"): Ponto => ({ ano, valor, status });

describe("tendenciaLinear", () => {
  it("ajusta a reta por mínimos quadrados e devolve a inclinação por ano", () => {
    const t = tendenciaLinear([ponto(2020, 10), ponto(2021, 20), ponto(2022, 30), ponto(2023, 40), ponto(2024, 50)]);
    expect(t).not.toBeNull();
    expect(t!.inclinacao).toBeCloseTo(10, 10);
    expect(t!.valores.map((v) => Math.round(v))).toEqual([10, 20, 30, 40, 50]);
    expect(t!.r2).toBeCloseTo(1, 10);
  });

  it("ignora anos sem valor em vez de tratá-los como zero, usando o ano real no eixo x", () => {
    const t = tendenciaLinear([ponto(2020, 10), ponto(2021, null, "sigiloso"), ponto(2022, 30), ponto(2023, null, "inexistente"), ponto(2024, 50)]);
    expect(t!.inclinacao).toBeCloseTo(10, 10); // com zeros no lugar, a inclinação seria bem menor
    expect(t!.valores).toHaveLength(5);
    expect(t!.valores[1]).toBeCloseTo(20, 10); // a reta atravessa o ano sem dado
    expect(t!.valores[3]).toBeCloseTo(40, 10);
  });

  it("mede a qualidade do ajuste com R² entre 0 e 1", () => {
    const t = tendenciaLinear([ponto(2020, 10), ponto(2021, 50), ponto(2022, 20), ponto(2023, 60), ponto(2024, 30)]);
    expect(t!.r2).toBeGreaterThan(0);
    expect(t!.r2).toBeLessThan(0.5);
  });

  it("série decrescente tem inclinação negativa", () => {
    expect(tendenciaLinear([ponto(2020, 100), ponto(2021, 80), ponto(2022, 60)])!.inclinacao).toBeCloseTo(-20, 10);
  });

  it("série constante dá reta horizontal com ajuste perfeito", () => {
    const t = tendenciaLinear([ponto(2020, 7), ponto(2021, 7), ponto(2022, 7)]);
    expect(t!.inclinacao).toBe(0);
    expect(t!.r2).toBe(1);
  });

  it("não calcula com menos de dois anos com valor", () => {
    expect(tendenciaLinear([])).toBeNull();
    expect(tendenciaLinear([ponto(2020, 5)])).toBeNull();
    expect(tendenciaLinear([ponto(2020, 5), ponto(2021, null, "sigiloso")])).toBeNull();
  });
});

describe("pontosDaTendencia", () => {
  it("devolve os valores da reta como pontos ok, um por ano do período", () => {
    const pontos = [ponto(2020, 10), ponto(2021, null, "sigiloso"), ponto(2022, 30)];
    const t = tendenciaLinear(pontos)!;
    const reta = pontosDaTendencia(pontos, t);
    expect(reta.map((p) => p.ano)).toEqual([2020, 2021, 2022]);
    expect(reta.every((p) => p.status === "ok")).toBe(true);
    expect(reta[1]!.valor).toBeCloseTo(20, 10);
  });
});

describe("descreverTendencia", () => {
  it("explica a inclinação em texto com sinal, unidade por ano e ajuste", () => {
    const t = tendenciaLinear([ponto(2020, 1000), ponto(2021, 1500), ponto(2022, 2000), ponto(2023, 2500)])!;
    const texto = descreverTendencia(t, "Toneladas");
    expect(texto).toContain("+500 toneladas por ano");
    expect(texto).toContain("crescimento médio de +500");
    expect(texto).toMatch(/R² = 1,00/);
  });

  it("usa 'queda' para inclinação negativa", () => {
    const t = tendenciaLinear([ponto(2020, 100), ponto(2021, 80), ponto(2022, 60)])!;
    const texto = descreverTendencia(t, "Cabeças");
    expect(texto).toContain("−20 cabeças por ano");
    expect(texto).toContain("queda média de −20");
  });

  it("avisa quando a tendência é estável", () => {
    const t = tendenciaLinear([ponto(2020, 7), ponto(2021, 7), ponto(2022, 7)])!;
    expect(descreverTendencia(t, "Hectares")).toContain("estável");
  });
});
