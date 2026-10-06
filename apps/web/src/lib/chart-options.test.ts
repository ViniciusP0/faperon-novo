import { describe, expect, it } from "vitest";
import type { Ponto } from "./api-types";
import { comTemaEscuro, opcaoComparacao, opcaoSerie, PALETA_ESCURA } from "./chart-options";

const p = (ano: number, valor: number | null): Ponto => ({ ano, valor, status: valor === null ? "sigiloso" : "ok" });

type Serie = {
  type: string;
  name: string;
  data: (number | null)[];
  lineStyle?: { type: string };
  symbol?: string;
  areaStyle?: unknown;
  markPoint?: { data: { coord: [string, number] }[] };
};
const series = (o: unknown) => (o as { series: Serie[] }).series;

describe("opcaoSerie", () => {
  it("desenha a série como área e adiciona a tendência tracejada quando há dois anos com dado", () => {
    const [area, tendencia] = series(opcaoSerie("Rondônia (total)", [p(2020, 10), p(2021, null), p(2022, 30)], "Toneladas"));
    expect(area).toMatchObject({ type: "line", name: "Rondônia (total)", data: [10, null, 30] });
    expect(area!.areaStyle).toBeDefined();
    expect(tendencia).toMatchObject({ type: "line", name: "Tendência linear", symbol: "none", lineStyle: { type: "dashed" } });
    expect(tendencia!.data[1]).toBeCloseTo(20, 8); // atravessa o ano sem dado
  });

  it("mostra só a área quando não dá para calcular a tendência", () => {
    expect(series(opcaoSerie("X", [p(2020, 10), p(2021, null)], "Toneladas"))).toHaveLength(1);
  });

  it("anota o pico e o último ano com dado", () => {
    const [area] = series(opcaoSerie("X", [p(2020, 10), p(2021, 50), p(2022, 30), p(2023, null)], "Toneladas"));
    expect(area!.markPoint!.data.map((d) => d.coord)).toEqual([
      ["2021", 50],
      ["2022", 30],
    ]);
  });

  it("anota só um ponto quando o pico é o último ano", () => {
    const [area] = series(opcaoSerie("X", [p(2020, 10), p(2021, 50)], "Toneladas"));
    expect(area!.markPoint!.data).toHaveLength(1);
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

describe("opcaoComparacao", () => {
  const anos = (n: number) => Array.from({ length: n }, (_, i) => 2015 + i);
  const serieDe = (nome: string, n: number) => ({ id: nome, nome, pontos: anos(n).map((a) => p(a, a)) });

  it("usa colunas agrupadas até 6 anos", () => {
    expect(series(opcaoComparacao(anos(6), [serieDe("A", 6), serieDe("B", 6)], "t")).map((s) => s.type)).toEqual(["bar", "bar"]);
  });

  it("usa linhas acima de 6 anos", () => {
    expect(series(opcaoComparacao(anos(10), [serieDe("A", 10), serieDe("B", 10)], "t")).map((s) => s.type)).toEqual(["line", "line"]);
  });
});

describe("tema escuro dos gráficos", () => {
  it("clareia a série de área e preserva a cor da tendência", () => {
    const escuro = comTemaEscuro(opcaoSerie("Soja", [p(2020, 1), p(2021, 2), p(2022, 3)], "t")) as unknown as {
      series: { name: string; lineStyle: { color: string } }[];
    };
    expect(escuro.series[0]!.lineStyle.color).toBe(PALETA_ESCURA[0]);
    expect(escuro.series[1]!.lineStyle.color).toBe(PALETA_ESCURA[1]);
  });

  it("troca paleta, eixos e legenda por cores legíveis no fundo escuro e mantém os dados", () => {
    const claro = opcaoSerie("Soja", [p(2020, 1), p(2021, 2), p(2022, 3)], "t");
    const escuro = comTemaEscuro(claro) as { color: string[]; legend: { textStyle: { color: string } }; series: Serie[] };
    expect(escuro.color).toEqual(PALETA_ESCURA);
    expect(escuro.legend.textStyle.color).toBe("#e8f0ec");
    expect(series(escuro).map((s) => s.data)).toEqual(series(claro).map((s) => s.data));
  });
});
