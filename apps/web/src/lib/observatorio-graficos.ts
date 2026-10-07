import type { EChartsCoreOption } from "echarts/core";
import type { AnoValor, ItemValor, MunicipioMapa, Opcao } from "./api-types";
import { PALETA } from "./chart-options";
import { formatCompacto, formatNumero } from "./format";

export const COR_SEM_DADO = "#c9d3ce";
/** A última cor é reservada para "outras". */
export const CORES_CATEGORIA = [...PALETA, "#a3324b", "#0f7c8c", "#8a6d1f", "#7a8a84"];
const COR_OUTRAS = CORES_CATEGORIA[CORES_CATEGORIA.length - 1]!;
const ESCALA = ["#e6f2ec", "#9fd0b5", "#3f9a73", "#00604e", "#003329"];
const texto = { fontFamily: "Poppins, system-ui, sans-serif" };

export function optionTreemap(itens: ItemValor[], unidade: string): EChartsCoreOption {
  return {
    color: CORES_CATEGORIA,
    textStyle: texto,
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: <strong>${formatNumero(p.value)}</strong> ${unidade.toLowerCase()}` },
    series: [{
      type: "treemap", roam: false, nodeClick: false, breadcrumb: { show: false },
      label: { formatter: "{b}" },
      data: itens.filter((i) => i.valor !== null).map((i) => ({ name: i.nome, value: i.valor as number })),
    }],
  };
}

export function optionAreaEmpilhada(evolucao: { anos: number[]; itens: { nome: string; valores: (number | null)[] }[] }, unidade: string): EChartsCoreOption {
  return {
    color: CORES_CATEGORIA, textStyle: texto,
    tooltip: { trigger: "axis" }, legend: { type: "scroll", top: 0 },
    grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: evolucao.anos.map(String), boundaryGap: false },
    yAxis: { type: "value", name: unidade, axisLabel: { formatter: (v: number) => formatCompacto(v) } },
    series: evolucao.itens.map((i) => ({ type: "line", name: i.nome, stack: "total", areaStyle: {}, symbol: "none", data: i.valores })),
  };
}

export function optionIndices(indices: { anos: number[]; area: (number | null)[]; rendimento: (number | null)[]; producao: (number | null)[] }): EChartsCoreOption {
  return {
    color: PALETA, textStyle: texto, tooltip: { trigger: "axis" }, legend: { top: 0 },
    grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: indices.anos.map(String) },
    yAxis: { type: "value", name: "Índice (início = 100)" },
    series: [
      { type: "line", name: "Produção", data: indices.producao },
      { type: "line", name: "Área colhida", data: indices.area },
      { type: "line", name: "Rendimento", data: indices.rendimento },
    ],
  };
}

export function optionDecomposicao(parteArea: number, parteRendimento: number): EChartsCoreOption {
  return {
    color: [PALETA[2]!, PALETA[0]!], textStyle: texto, legend: { top: 0 },
    tooltip: { formatter: (p: { seriesName: string; value: number }) => `${p.seriesName}: <strong>${formatNumero(p.value)}%</strong>` },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
    yAxis: { type: "category", data: ["Contribuição"] },
    series: [
      { type: "bar", name: "Expansão de área", stack: "c", data: [parteArea], label: { show: true, formatter: "{c}%" } },
      { type: "bar", name: "Ganho de produtividade", stack: "c", data: [parteRendimento], label: { show: true, formatter: "{c}%" } },
    ],
  };
}

export function optionBarrasHorizontais(itens: { nome: string; valor: number | null }[], unidade: string): EChartsCoreOption {
  const ordenados = [...itens].filter((i) => i.valor !== null).reverse();
  return {
    color: PALETA, textStyle: texto, tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", name: unidade, axisLabel: { formatter: (v: number) => formatCompacto(v) } },
    yAxis: { type: "category", data: ordenados.map((i) => i.nome) },
    series: [{ type: "bar", data: ordenados.map((i) => i.valor) }],
  };
}

export function optionLinha(pontos: AnoValor[], nome: string, unidade: string): EChartsCoreOption {
  return {
    color: PALETA, textStyle: texto, tooltip: { trigger: "axis" },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: pontos.map((p) => String(p.ano)) },
    yAxis: { type: "value", name: unidade, axisLabel: { formatter: (v: number) => formatCompacto(v) } },
    series: [{ type: "line", name: nome, data: pontos.map((p) => p.valor), areaStyle: { opacity: 0.15 } }],
  };
}

function corDaCategoria(slug: string, indice: number): string {
  if (slug === "outras") return COR_OUTRAS;
  // Evita a cor reservada de "outras" e nunca fica sem cor (o ECharts descarta categorias sem cor).
  return CORES_CATEGORIA[indice % (CORES_CATEGORIA.length - 1)]!;
}

export function optionMapa(municipios: MunicipioMapa[], unidade: string, categorias: Opcao[]): EChartsCoreOption {
  const porCategoria = categorias.length > 0;
  const nomeCat = new Map(categorias.map((c) => [c.slug, c.nome]));
  const valores = municipios.map((m) => m.valor).filter((v): v is number => v !== null);
  const min = valores.length ? Math.min(...valores) : 0;
  const max = valores.length ? Math.max(...valores) : 1;
  const dados = municipios.map((m) => {
    const valor = porCategoria ? (m.categoria ? nomeCat.get(m.categoria) ?? null : null) : m.valor;
    return {
      name: m.codigo_ibge,
      value: valor,
      nome: m.nome,
      status: m.status,
      // Sigiloso e sem dado ficam cinza: nunca entram na escala como zero.
      ...(valor === null ? { itemStyle: { areaColor: COR_SEM_DADO } } : {}),
    };
  });
  return {
    textStyle: texto,
    tooltip: {
      formatter: (p: { data?: { nome: string; value: number | string | null; status: string } }) => {
        if (!p.data) return "";
        const v = p.data.value;
        const rotulo = v === null || v === undefined
          ? (p.data.status === "sigiloso" ? "sigiloso" : "sem dado")
          : typeof v === "number" ? `${formatNumero(v)} ${unidade.toLowerCase()}`.trim() : v;
        return `${p.data.nome}: <strong>${rotulo}</strong>`;
      },
    },
    visualMap: porCategoria
      ? {
        type: "piecewise",
        categories: categorias.map((c) => c.nome),
        inRange: { color: categorias.map((c, i) => corDaCategoria(c.slug, i)) },
        left: 0, bottom: 0, textStyle: texto,
      }
      : {
        type: "continuous", min, max: max > min ? max : min + 1,
        inRange: { color: ESCALA }, text: ["Maior", "Menor"], calculable: false, left: 0, bottom: 0, textStyle: texto,
      },
    series: [{ type: "map", map: "rondonia", nameProperty: "codigo_ibge", roam: false, data: dados, emphasis: { label: { show: false } }, select: { disabled: true } }],
  };
}
