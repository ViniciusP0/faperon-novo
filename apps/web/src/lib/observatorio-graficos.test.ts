// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MapChart } from "echarts/charts";
import { TooltipComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { describe, expect, it } from "vitest";
import { PALETA_ESCURA } from "./chart-options";
import type { MunicipioMapa } from "./api-types";
import {
  COR_SEM_DADO,
  COR_SEM_DADO_ESCURO,
  CORES_CATEGORIA,
  optionLinhasEmpilhadas,
  optionBarrasHorizontais,
  optionDecomposicao,
  optionIndices,
  optionLinha,
  optionMapa,
  optionTreemap,
} from "./observatorio-graficos";
import { formatBilhoesEixo, formatCompacto, formatMilReais, formatoPorUnidade } from "./format";

echarts.use([MapChart, TooltipComponent, VisualMapComponent, SVGRenderer]);

const m = (codigo: string, valor: number | null, status: MunicipioMapa["status"], categoria: string | null = null): MunicipioMapa =>
  ({ codigo_ibge: codigo, nome: codigo, microrregiao: "", valor, status, categoria });

type DadoMapa = { name: string; value: number | string | null; itemStyle?: { areaColor: string } };
type OpcaoMapa = {
  series: { nameProperty: string; map: string; data: DadoMapa[] }[];
  visualMap: { type: string; min?: number; max?: number; pieces?: { value: number; label: string; color: string }[]; inRange: { color: string[] } };
  tooltip: { formatter: (p: unknown) => string };
};

const malha = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../public/geo/ro-municipios.json"), "utf8"),
) as { features: { properties: { codigo_ibge: string } }[] };

function renderizar(option: object): string {
  echarts.registerMap("rondonia", malha as never);
  const chart = echarts.init(null, undefined, { renderer: "svg", ssr: true, width: 600, height: 400 });
  chart.setOption({ ...option, animation: false });
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}

/** Só os caminhos das regiões do mapa (os da legenda não têm ecmeta_data_index). */
function regioes(svg: string): string[] {
  return (svg.match(/<path[^>]*>/g) ?? []).filter((p) => p.includes("ecmeta_data_index"));
}
function caminhosComCor(svg: string, cor: string): string[] {
  return regioes(svg).filter((p) => p.toLowerCase().includes(`fill="${cor.toLowerCase()}"`));
}

describe("mapa e barras falam a mesma língua: valores por extenso e microrregião explícita", () => {
  const fmt = formatoPorUnidade("Mil Reais", 2_408_218)!;
  const muni = (codigo: string, nome: string, valor: number | null, microrregiao: string, status: MunicipioMapa["status"] = "ok"): MunicipioMapa => ({ codigo_ibge: codigo, nome, microrregiao, valor, status, categoria: null });

  it("o balão do mapa escreve o valor por extenso e diz a que microrregião o município pertence", () => {
    const o = optionMapa([muni("1", "Porto Velho", 1_112_550, "Porto Velho"), muni("2", "Colorado do Oeste", 44_904, "Colorado do Oeste")], "Mil Reais", [], false, fmt) as unknown as {
      tooltip: { formatter: (p: unknown) => string };
    };
    const balao = o.tooltip.formatter({ data: { nome: "Colorado do Oeste", value: 44_904, status: "ok", microrregiao: "Colorado do Oeste" } });
    expect(balao).toContain("R$ 44,9 milhões");
    expect(balao).not.toContain("44.904");
    expect(balao).toContain("Microrregião: Colorado do Oeste");
  });

  it("sigiloso e sem dado continuam em texto, sem valor", () => {
    const o = optionMapa([muni("1", "Cabixi", null, "Colorado do Oeste", "sigiloso")], "Mil Reais", [], false, fmt) as unknown as { tooltip: { formatter: (p: unknown) => string } };
    expect(o.tooltip.formatter({ data: { nome: "Cabixi", value: null, status: "sigiloso", microrregiao: "Colorado do Oeste" } })).toContain("sigiloso");
  });

  it("a legenda do mapa mostra o maior e o menor valor, não só as palavras", () => {
    const o = optionMapa([muni("1", "Porto Velho", 1_112_550, "A"), muni("2", "Colorado do Oeste", 44_904, "B"), muni("3", "Cabixi", null, "B", "sigiloso")], "Mil Reais", [], false, fmt) as unknown as {
      visualMap: { text: string[]; min: number; max: number };
    };
    expect(o.visualMap.text).toEqual(["Maior: R$ 1,1 bilhão", "Menor: R$ 44,9 milhões"]);
    expect([o.visualMap.min, o.visualMap.max]).toEqual([44_904, 1_112_550]);
  });

  it("sem formatador o mapa mantém o comportamento anterior", () => {
    const o = optionMapa([muni("1", "Porto Velho", 1_112_550, "A")], "Mil Reais", []) as unknown as { visualMap: { text: string[] } };
    expect(o.visualMap.text).toEqual(["Maior", "Menor"]);
  });

  it("as barras usam a mesma escala: eixo em R$ bilhões e balão por extenso com o número de municípios", () => {
    const o = optionBarrasHorizontais(
      [{ nome: "Microrregião Porto Velho", valor: 2_408_218 }, { nome: "Microrregião Cacoal", valor: 800_000 }],
      "Mil Reais", false, fmt, { "Microrregião Porto Velho": "7 municípios" },
    ) as unknown as {
      xAxis: { name: string; axisLabel: { formatter: (v: number) => string } };
      tooltip: { formatter: (p: unknown) => string };
    };
    expect(o.xAxis.name).toBe("R$ bilhões");
    expect(o.xAxis.axisLabel.formatter(1_500_000)).toBe("1,5");
    const balao = o.tooltip.formatter([{ name: "Microrregião Porto Velho", value: 2_408_218, marker: "" }]);
    expect(balao).toContain("Microrregião Porto Velho");
    expect(balao).toContain("R$ 2,4 bilhões");
    expect(balao).toContain("7 municípios");
  });

  it("sem formatador as barras continuam como antes (outros blocos usam)", () => {
    const o = optionBarrasHorizontais([{ nome: "A", valor: 1500 }], "R$/ha") as unknown as { xAxis: { name: string } };
    expect(o.xAxis.name).toBe("R$/ha");
  });
});

describe("proporção do mapa", () => {
  /** Largura/altura do estado na malha, com a longitude encurtada pelo cosseno da latitude central (o que a Terra tem de fato). */
  function proporcaoGeografica(): number {
    const xs: number[] = [];
    const ys: number[] = [];
    const percorrer = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === "number") { xs.push(c[0] as number); ys.push(c[1] as number); } else (c as unknown[]).forEach(percorrer);
    };
    (malha as unknown as { features: { geometry: { coordinates: unknown } }[] }).features.forEach((f) => percorrer(f.geometry.coordinates));
    const latCentral = (Math.min(...ys) + Math.max(...ys)) / 2;
    return ((Math.max(...xs) - Math.min(...xs)) * Math.cos((latCentral * Math.PI) / 180)) / (Math.max(...ys) - Math.min(...ys));
  }

  /** Largura/altura do que o ECharts realmente desenhou: junta todos os pontos dos caminhos das 52 regiões. */
  function proporcaoDesenhada(svg: string): number {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const tag of regioes(svg)) {
      const numeros = (/ d="([^"]+)"/.exec(tag)?.[1] ?? "").match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      for (let i = 0; i + 1 < numeros.length; i += 2) { xs.push(numeros[i]!); ys.push(numeros[i + 1]!); }
    }
    return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
  }

  it("desenha Rondônia com a proporção real (mais larga que alta), não esticada na vertical", () => {
    const municipios = malha.features.map((f) => m(f.properties.codigo_ibge, 1, "ok"));
    const esperada = proporcaoGeografica();
    expect(esperada).toBeGreaterThan(1.1); // o estado é mais largo que alto
    const desenhada = proporcaoDesenhada(renderizar(optionMapa(municipios, "Mil Reais", [])));
    expect(desenhada).toBeCloseTo(esperada, 1); // tolerância de ±0,05 (o ECharts simplifica e arredonda)
    expect(Math.abs(desenhada - esperada) / esperada).toBeLessThan(0.03);
  });
});

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
    expect(cat.visualMap.pieces).toEqual([{ value: 0, label: "Soja", color: CORES_CATEGORIA[0] }]);
    expect(cat.series[0]!.data).toEqual([]);
  });

  it("mapa por categoria colore pela cultura e tem legenda com rótulos", () => {
    const o = optionMapa(
      [m("1", 1, "ok", "soja"), m("2", 1, "ok", "outras"), m("3", null, "sigiloso")],
      "",
      [{ slug: "soja", nome: "Soja" }, { slug: "outras", nome: "Outras" }],
    ) as unknown as OpcaoMapa;
    expect(o.visualMap.type).toBe("piecewise");
    expect(o.visualMap.pieces!.map((p) => p.label)).toEqual(["Soja", "Outras"]);
    expect(o.visualMap.pieces!.map((p) => p.color)).toEqual([CORES_CATEGORIA[0], CORES_CATEGORIA[8]]);
    const dados = o.series[0]!.data;
    expect(dados.map((d) => d.value)).toEqual([0, 1, null]);
    expect(dados[2]!.itemStyle!.areaColor).toBe(COR_SEM_DADO);
  });

  it("mapa por categoria tem uma cor para cada categoria, mesmo com mais de nove", () => {
    const cats = Array.from({ length: 12 }, (_, i) => ({ slug: `c${i}`, nome: `C${i}` }));
    const o = optionMapa([], "", cats) as unknown as OpcaoMapa;
    expect(o.visualMap.pieces).toHaveLength(12);
    expect(o.visualMap.pieces!.every((p) => typeof p.color === "string")).toBe(true);
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
    expect(caminhosComCor(svg, COR_SEM_DADO)).toHaveLength(1);
    const coloridas = regioes(svg).filter((p) => /fill="rgb\((?!0,0,0)/.test(p));
    expect(coloridas).toHaveLength(51);
    expect(new Set(coloridas.map((p) => p.match(/fill="([^"]*)"/)![1])).size).toBeGreaterThan(10);
  });

  it("malha real: o ECharts aplica a cor da categoria", () => {
    const codigos = malha.features.map((f) => f.properties.codigo_ibge);
    const svg = renderizar(optionMapa(codigos.map((c) => m(c, 1, "ok", "soja")), "", [{ slug: "soja", nome: "Soja" }]));
    expect(regioes(svg).filter((p) => p.includes("rgb(0,0,0)"))).toHaveLength(0);
    expect(caminhosComCor(svg, CORES_CATEGORIA[0]!)).toHaveLength(52);
  });

  it("decomposição tem duas barras que somam 100", () => {
    const o = optionDecomposicao(30, 70) as { series: { data: number[] }[] };
    expect(o.series.map((s) => s.data[0])).toEqual([30, 70]);
  });

  it("evolução empilhada: só linhas sólidas, sem preenchimento, e a linha de cima rotulada como a soma", () => {
    const ev = { anos: [2023, 2024], itens: [{ nome: "Soja", valores: [1000, 2000] }, { nome: "Café", valores: [500, null] }, { nome: "Leite", valores: [250, 300] }] };
    type S = { type: string; stack: string; areaStyle?: unknown; lineStyle: { width: number }; endLabel?: unknown };
    const o = optionLinhasEmpilhadas(ev, "R$ bilhões", false, { eixo: formatBilhoesEixo, valor: formatMilReais }) as unknown as { series: S[]; title: { text: string; right: number; top: number } };
    expect(o.series).toHaveLength(3);
    for (const s of o.series) {
      expect(s.type).toBe("line");
      expect(s.stack).toBe("total");
      expect(s.areaStyle).toBeUndefined();
      expect(s.lineStyle.width).toBeGreaterThanOrEqual(2);
    }
    // a soma do último ano (2000 + 300; o nulo não entra) fica num título no canto superior direito, nunca sobre as linhas
    expect(o.series.every((s) => s.endLabel === undefined)).toBe(true);
    expect(o.title.text).toBe("Soma: R$ 2,3 mi");
    expect(o.title.right).toBeGreaterThanOrEqual(0);
    expect(o.title.top).toBeGreaterThanOrEqual(0);
  });

  it("evolução empilhada sem formatador usa o compacto e não rotula quando o último ano não tem dado", () => {
    const com = optionLinhasEmpilhadas({ anos: [2024], itens: [{ nome: "A", valores: [1500] }] }, "x") as unknown as { title: { text: string } };
    expect(com.title.text).toBe("Soma: " + formatCompacto(1500));
    const sem = optionLinhasEmpilhadas({ anos: [2024], itens: [{ nome: "A", valores: [null] }] }, "x") as unknown as { title?: unknown };
    expect(sem.title).toBeUndefined();
  });

  it("área empilhada e índices mapeiam séries e anos, inclusive vazios", () => {
    const a = optionLinhasEmpilhadas({ anos: [2020, 2021], itens: [{ nome: "Soja", valores: [1, null] }] }, "x") as {
      xAxis: { data: string[] };
      series: { name: string; stack: string; data: (number | null)[] }[];
    };
    expect(a.xAxis.data).toEqual(["2020", "2021"]);
    expect(a.series[0]).toMatchObject({ name: "Soja", stack: "total", data: [1, null] });
    expect((optionLinhasEmpilhadas({ anos: [], itens: [] }, "") as { series: unknown[] }).series).toEqual([]);
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

  it("tema escuro: área empilhada tem uma cor distinta por série", () => {
    const ev = { anos: [2020], itens: [1, 2, 3].map((n) => ({ nome: `S${n}`, valores: [n] })) };
    const o = optionLinhasEmpilhadas(ev, "x", true) as { color: string[]; series: unknown[] };
    expect(new Set(o.color.slice(0, 3)).size).toBe(3);
    expect(o.color.slice(0, 5)).toEqual(PALETA_ESCURA);
  });

  it("tema escuro: mapa e treemap não têm eixos e o texto da legenda é legível", () => {
    const mapa = optionMapa([m("1", 1, "ok")], "", [], true) as unknown as Record<string, unknown> & OpcaoMapa & { visualMap: { textStyle: { color: string } } };
    expect(mapa.xAxis).toBeUndefined();
    expect(mapa.yAxis).toBeUndefined();
    expect(mapa.visualMap.textStyle.color).toBe("#e8f0ec");
    const claro = optionMapa([m("1", 1, "ok")], "", []) as unknown as { visualMap: { textStyle: { color: string } } };
    expect(claro.visualMap.textStyle.color).not.toBe("#e8f0ec");
    const tm = optionTreemap([{ slug: "a", nome: "A", valor: 1, participacao: 1 }], "", true) as Record<string, unknown> & { color: string[] };
    expect(tm.xAxis).toBeUndefined();
    expect(tm.color.slice(0, 5)).toEqual(PALETA_ESCURA);
  });

  it("tema escuro: escala clara o bastante, borda do card e cinza de sem dado distinto da escala", () => {
    const e = optionMapa([m("1", 1, "ok"), m("2", null, "sigiloso")], "", [], true) as unknown as OpcaoMapa & { series: { itemStyle: { borderColor: string } }[] };
    expect(e.visualMap.inRange.color).not.toContain("#003329");
    expect(e.visualMap.inRange.color).not.toContain(COR_SEM_DADO_ESCURO);
    expect(e.series[0]!.data[1]!.itemStyle!.areaColor).toBe(COR_SEM_DADO_ESCURO);
    expect(e.series[0]!.itemStyle.borderColor).not.toBe("#444");
    const c = optionMapa([m("1", 1, "ok")], "", []) as unknown as OpcaoMapa;
    expect(c.visualMap.inRange.color).not.toContain(COR_SEM_DADO);
    expect(COR_SEM_DADO_ESCURO).not.toBe(COR_SEM_DADO);
  });

  it("tooltips escapam HTML dos nomes", () => {
    const o = optionMapa([{ ...m("1", 5, "ok"), nome: "<img src=x>" }], "", []) as unknown as OpcaoMapa;
    const html = o.tooltip.formatter({ data: { ...o.series[0]!.data[0], nome: "<img src=x>", status: "ok" } });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    const t = optionTreemap([], "") as { tooltip: { formatter: (p: unknown) => string } };
    expect(t.tooltip.formatter({ name: "<b>", value: 1 })).not.toContain("<b>");
  });

  it("decomposição com entradas inválidas não gera NaN", () => {
    const o = optionDecomposicao(Number.NaN, 50) as { series: { data: unknown[] }[] };
    expect(o.series.every((s) => s.data.length === 0)).toBe(true);
    expect(JSON.stringify(o)).not.toContain("NaN");
  });
});

describe("formatação pt-BR e rótulos legíveis (F4, F5, F13)", () => {
  type Tip = { tooltip: { valueFormatter: (v: unknown) => string } };
  const fmt = (o: unknown) => (o as Tip).tooltip.valueFormatter;

  it("todos os gráficos de eixo formatam o tooltip em pt-BR, nunca 12,935,713.5", () => {
    const opcoes = [
      optionLinhasEmpilhadas({ anos: [2020], itens: [{ nome: "S", valores: [1] }] }, "x"),
      optionIndices({ anos: [2020], area: [1], rendimento: [1], producao: [1] }),
      optionDecomposicao(30, 70),
      optionBarrasHorizontais([{ nome: "A", valor: 1 }], "u"),
      optionLinha([{ ano: 2020, valor: 1 }], "N", "u"),
    ];
    for (const o of opcoes) {
      expect(fmt(o)(12935713.5)).toBe("12.935.714");
      expect(fmt(o)(84.06)).toBe("84,06");
      expect(fmt(o)(null)).toBe("–");
    }
  });

  it("decomposição escreve percentuais com vírgula e uma casa decimal", () => {
    const o = optionDecomposicao(84.06, 15.94) as unknown as {
      series: { label: { formatter: (p: { value: number }) => string } }[];
      tooltip: { formatter: (p: { seriesName: string; value: number }) => string };
    };
    expect(o.series[0]!.label.formatter({ value: 84.06 })).toBe("84,1%");
    expect(o.series[1]!.label.formatter({ value: 15.94 })).toBe("15,9%");
    expect(o.tooltip.formatter({ seriesName: "Expansão de área", value: 84.06 })).toContain("84,1%");
  });

  it("área empilhada em mil R$ usa bilhões no eixo e R$ por extenso no tooltip", () => {
    const o = optionLinhasEmpilhadas({ anos: [2020], itens: [{ nome: "S", valores: [1] }] }, "R$ bilhões", false, {
      eixo: formatBilhoesEixo,
      valor: formatMilReais,
    }) as unknown as { yAxis: { name: string; axisLabel: { formatter: (v: number) => string } } } & Tip;
    expect(o.yAxis.name).toBe("R$ bilhões");
    expect(o.yAxis.axisLabel.formatter(15_000_000)).toBe("15");
    expect(fmt(o)(12_935_713)).toBe("R$ 12,9 bi");
  });

  it("treemap com formatador mostra o valor por extenso no tooltip", () => {
    const o = optionTreemap([{ slug: "a", nome: "Soja", valor: 4_200_000, participacao: 70 }], "Mil Reais", false, formatMilReais) as unknown as {
      tooltip: { formatter: (p: { name: string; value: number }) => string };
    };
    expect(o.tooltip.formatter({ name: "Soja", value: 4_200_000 })).toContain("R$ 4,2 bi");
  });

  it("rótulos de eixo têm folga: nada de Contribuição, cidades ou unidade cortados", () => {
    const d = optionDecomposicao(30, 70) as unknown as { grid: { left: number; right: number; containLabel: boolean } };
    expect(d.grid.containLabel).toBe(true);
    expect(d.grid.left).toBeGreaterThanOrEqual(16);
    expect(d.grid.right).toBeGreaterThanOrEqual(32);
    const b = optionBarrasHorizontais([{ nome: "Colorado do Oeste", valor: 2 }], "R$/ha") as unknown as {
      grid: { left: number; right: number; bottom: number; containLabel: boolean };
      xAxis: { nameLocation: string };
      yAxis: { axisLabel: { overflow: string; width: number } };
    };
    expect(b.grid.containLabel).toBe(true);
    expect(b.grid.left).toBeGreaterThanOrEqual(16);
    expect(b.grid.right).toBeGreaterThanOrEqual(32);
    expect(b.xAxis.nameLocation).toBe("middle");
    expect(b.grid.bottom).toBeGreaterThanOrEqual(32);
    expect(b.yAxis.axisLabel.overflow).toBe("break");
    expect(b.yAxis.axisLabel.width).toBeGreaterThanOrEqual(100);
  });
});
