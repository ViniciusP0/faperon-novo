import { describe, expect, it } from "vitest";
import type { Ponto } from "./api-types";
import { opcaoSerie } from "./chart-options";

const p = (ano: number, valor: number | null): Ponto => ({ ano, valor, status: valor === null ? "sigiloso" : "ok" });

type Serie = { type: string; name: string; data: (number | null)[]; lineStyle?: { type: string }; symbol?: string };
const series = (o: unknown) => (o as { series: Serie[] }).series;

describe("opcaoSerie", () => {
  it("adiciona a linha de tendência tracejada sobre as colunas quando há dois anos com dado", () => {
    const [barras, tendencia] = series(opcaoSerie("Rondônia (total)", [p(2020, 10), p(2021, null), p(2022, 30)], "Toneladas"));
    expect(barras).toMatchObject({ type: "bar", name: "Rondônia (total)", data: [10, null, 30] });
    expect(tendencia).toMatchObject({ type: "line", name: "Tendência linear", symbol: "none", lineStyle: { type: "dashed" } });
    expect(tendencia!.data[1]).toBeCloseTo(20, 8); // atravessa o ano sem dado
  });

  it("mostra só as colunas quando não dá para calcular a tendência", () => {
    expect(series(opcaoSerie("X", [p(2020, 10), p(2021, null)], "Toneladas"))).toHaveLength(1);
  });

  it("o tooltip mostra o valor da reta com a unidade", () => {
    const opt = opcaoSerie("X", [p(2020, 10), p(2021, 20)], "Toneladas") as { tooltip: { formatter: (a: unknown) => string } };
    const html = opt.tooltip.formatter([
      { axisValue: "2021", seriesName: "Tendência linear", seriesIndex: 1, dataIndex: 1, marker: "" },
    ]);
    expect(html).toContain("Tendência linear");
    expect(html).toContain("20");
    expect(html).toContain("toneladas");
  });
});
