// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MapChart } from "echarts/charts";
import { TooltipComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { describe, expect, it } from "vitest";
import type { MunicipioMapa } from "./api-types";
import {
  COR_SEM_DADO,
  CORES_CATEGORIA,
  optionAreaEmpilhada,
  optionBarrasHorizontais,
  optionDecomposicao,
  optionIndices,
  optionLinha,
  optionMapa,
  optionTreemap,
} from "./observatorio-graficos";

echarts.use([MapChart, TooltipComponent, VisualMapComponent, SVGRenderer]);

const m = (codigo: string, valor: number | null, status: MunicipioMapa["status"], categoria: string | null = null): MunicipioMapa =>
  ({ codigo_ibge: codigo, nome: codigo, microrregiao: "", valor, status, categoria });

type DadoMapa = { name: string; value: number | string | null; itemStyle?: { areaColor: string } };
type OpcaoMapa = {
  series: { nameProperty: string; map: string; data: DadoMapa[] }[];
  visualMap: { type: string; min?: number; max?: number; categories?: string[]; inRange: { color: string[] } };
  tooltip: { formatter: (p: unknown) => string };
};

const malha = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/geo/ro-municipios.json"), "utf8"),
) as { features: { properties: { codigo_ibge: string } }[] };

function renderizar(option: object): string {
  echarts.registerMap("rondonia", malha as never);
  const chart = echarts.init(null, undefined, { renderer: "svg", ssr: true, width: 600, height: 400 });
  chart.setOption({ ...option, animation: false });
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}

describe("options do Observatório", () => {
  it("treemap usa as participações e ignora valores nulos", () => {
    const o = optionTreemap([
      { slug: "soja", nome: "Soja", valor: 70, participacao: 70 },
      { slug: "x", nome: "X", valor: null, participacao: null },
    ], "Mil Reais") as { series: { type: string; data: { name: string; value: number }[] }[] };
    expect(o.series[0]!.type).toBe("treemap");
    expect(o.series[0]!.data).toEqual([{ name: "Soja", value: 70 }]);
  });

  it("treemap aceita lista vazia", () => {
    const o = optionTreemap([], "") as { series: { data: unknown[] }[] };
    expect(o.series[0]!.data).toEqual([]);
  });

  it("mapa contínuo pinta sigiloso e sem dado de cinza, nunca como zero", () => {
    const o = optionMapa([m("1", 10, "ok"), m("2", null, "sigiloso"), m("3", null, "sem_dado")], "Mil Reais", []) as unknown as OpcaoMapa;
    const dados = o.series[0]!.data;
    expect(dados.find((d) => d.name === "1")!.value).toBe(10);
    expect(dados.find((d) => d.name === "1")!.itemStyle).toBeUndefined();
    for (const cod of ["2", "3"]) {
      expect(dados.find((d) => d.name === cod)!.value).toBeNull();
      expect(dados.find((d) => d.name === cod)!.itemStyle!.areaColor).toBe(COR_SEM_DADO);
    }
    expect(o.series[0]!.nameProperty).toBe("codigo_ibge");
    expect(o.series[0]!.map).toBe("rondonia");
    expect(o.visualMap.type).toBe("continuous");
    expect(o.visualMap.min).toBe(10);
    expect(o.visualMap.max).toBe(11);
  });

  it("mapa tem limites seguros com lista vazia, só nulos e um único ponto", () => {
    const vazio = optionMapa([], "", []) as unknown as OpcaoMapa;
    expect([vazio.visualMap.min, vazio.visualMap.max]).toEqual([0, 1]);
    const nulos = optionMapa([m("1", null, "sigiloso")], "", []) as unknown as OpcaoMapa;
    expect([nulos.visualMap.min, nulos.visualMap.max]).toEqual([0, 1]);
    const unico = optionMapa([m("1", 5, "ok")], "", []) as unknown as OpcaoMapa;
    expect(unico.visualMap.max!).toBeGreaterThan(unico.visualMap.min!);
    const cat = optionMapa([], "", [{ slug: "soja", nome: "Soja" }]) as unknown as OpcaoMapa;
    expect(cat.visualMap.categories).toEqual(["Soja"]);
    expect(cat.series[0]!.data).toEqual([]);
  });

  it("mapa por categoria colore pela cultura e tem legenda com rótulos", () => {
    const o = optionMapa(
      [m("1", 1, "ok", "soja"), m("2", 1, "ok", "outras"), m("3", null, "sigiloso")],
      "",
      [{ slug: "soja", nome: "Soja" }, { slug: "outras", nome: "Outras" }],
    ) as unknown as OpcaoMapa;
    expect(o.visualMap.type).toBe("piecewise");
    expect(o.visualMap.categories).toEqual(["Soja", "Outras"]);
    expect(o.visualMap.inRange.color).toEqual([CORES_CATEGORIA[0], CORES_CATEGORIA[8]]);
    const dados = o.series[0]!.data;
    expect(dados.map((d) => d.value)).toEqual(["Soja", "Outras", null]);
    expect(dados[2]!.itemStyle!.areaColor).toBe(COR_SEM_DADO);
  });

  it("mapa por categoria tem uma cor para cada categoria, mesmo com mais de nove", () => {
    const cats = Array.from({ length: 12 }, (_, i) => ({ slug: `c${i}`, nome: `C${i}` }));
    const o = optionMapa([], "", cats) as unknown as OpcaoMapa;
    expect(o.visualMap.inRange.color).toHaveLength(12);
  });

  it("tooltip diz sigiloso, sem dado ou o valor", () => {
    const o = optionMapa([m("1", 10, "ok"), m("2", null, "sigiloso"), m("3", null, "sem_dado")], "Mil Reais", []) as unknown as OpcaoMapa;
    const f = o.tooltip.formatter;
    const dado = (cod: string) => ({ data: o.series[0]!.data.find((d) => d.name === cod) });
    expect(f(dado("2"))).toContain("sigiloso");
    expect(f(dado("3"))).toContain("sem dado");
    expect(f(dado("1"))).toContain("10");
    expect(f({})).toBe("");
  });

  it("malha real: 52 municípios e todos casam pelo codigo_ibge", () => {
    expect(malha.features).toHaveLength(52);
    const codigos = malha.features.map((f) => f.properties.codigo_ibge);
    expect(new Set(codigos).size).toBe(52);
    const o = optionMapa(codigos.map((c, i) => m(c, i === 0 ? null : i, i === 0 ? "sigiloso" : "ok")), "", []) as unknown as OpcaoMapa;
    expect(o.series[0]!.data.map((d) => d.name).sort()).toEqual([...codigos].sort());
  });

  it("malha real: o ECharts renderiza o município sigiloso em cinza (nameProperty)", () => {
    const codigos = malha.features.map((f) => f.properties.codigo_ibge);
    const svg = renderizar(optionMapa(codigos.map((c, i) => m(c, i === 0 ? null : 10 + i, i === 0 ? "sigiloso" : "ok")), "", []));
    expect(svg.toLowerCase()).toContain(COR_SEM_DADO);
    expect(svg.match(/<path/g)!.length).toBeGreaterThanOrEqual(52);
  });

  it("malha real: o ECharts aplica a cor da categoria", () => {
    const codigos = malha.features.map((f) => f.properties.codigo_ibge);
    const svg = renderizar(optionMapa(codigos.map((c) => m(c, 1, "ok", "soja")), "", [{ slug: "soja", nome: "Soja" }]));
    expect(svg.toLowerCase()).toContain(CORES_CATEGORIA[0]!.toLowerCase());
  });

  it("decomposição tem duas barras que somam 100", () => {
    const o = optionDecomposicao(30, 70) as { series: { data: number[] }[] };
    expect(o.series.map((s) => s.data[0])).toEqual([30, 70]);
  });

  it("área empilhada e índices mapeiam séries e anos, inclusive vazios", () => {
    const a = optionAreaEmpilhada({ anos: [2020, 2021], itens: [{ nome: "Soja", valores: [1, null] }] }, "x") as {
      xAxis: { data: string[] };
      series: { name: string; stack: string; data: (number | null)[] }[];
    };
    expect(a.xAxis.data).toEqual(["2020", "2021"]);
    expect(a.series[0]).toMatchObject({ name: "Soja", stack: "total", data: [1, null] });
    expect((optionAreaEmpilhada({ anos: [], itens: [] }, "") as { series: unknown[] }).series).toEqual([]);
    const i = optionIndices({ anos: [2020], area: [100], rendimento: [100], producao: [100] }) as { series: { name: string }[] };
    expect(i.series.map((s) => s.name)).toEqual(["Produção", "Área colhida", "Rendimento"]);
  });

  it("barras horizontais descartam nulos e invertem a ordem; linha mapeia pontos", () => {
    const b = optionBarrasHorizontais([{ nome: "A", valor: 3 }, { nome: "B", valor: null }, { nome: "C", valor: 1 }], "u") as {
      yAxis: { data: string[] };
      series: { data: number[] }[];
    };
    expect(b.yAxis.data).toEqual(["C", "A"]);
    expect(b.series[0]!.data).toEqual([1, 3]);
    const l = optionLinha([{ ano: 2020, valor: 5 }, { ano: 2021, valor: null }], "N", "u") as {
      xAxis: { data: string[] };
      series: { name: string; data: (number | null)[] }[];
    };
    expect(l.xAxis.data).toEqual(["2020", "2021"]);
    expect(l.series[0]).toMatchObject({ name: "N", data: [5, null] });
    expect((optionLinha([], "N", "u") as { series: { data: unknown[] }[] }).series[0]!.data).toEqual([]);
  });
});
