import type { EChartsCoreOption } from "echarts/core";
import type { Ponto, SerieComparada } from "./api-types";
import { formatCompacto, formatValor } from "./format";
import { pontosDaTendencia, tendenciaLinear } from "./tendencia";

export const PALETA = ["#00604e", "#b45309", "#2b5672", "#7e3f98", "#5b8c2a"];

const base = (unidade: string, anos: number[]): EChartsCoreOption => ({
  color: PALETA,
  animation: false,
  grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
  xAxis: { type: "category", data: anos.map(String), axisTick: { alignWithLabel: true } },
  yAxis: {
    type: "value",
    name: unidade,
    nameTextStyle: { align: "left", color: "#46564f" },
    axisLabel: { color: "#46564f", formatter: (v: number) => formatCompacto(v) },
    splitLine: { lineStyle: { color: "#d3e1d8" } },
  },
  textStyle: { fontFamily: "Poppins, system-ui, sans-serif" },
});

function tooltip(unidade: string, pontosPorSerie: Ponto[][]): EChartsCoreOption["tooltip"] {
  return {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params: unknown) => {
      const itens = params as { axisValue: string; seriesName: string; seriesIndex: number; dataIndex: number; marker: string }[];
      if (!itens.length) return "";
      const linhas = itens.map((i) => {
        const p = pontosPorSerie[i.seriesIndex]?.[i.dataIndex];
        const valor = p ? formatValor(p.valor, p.status) : "–";
        return `${i.marker} ${i.seriesName}: <strong>${valor}</strong> ${p && p.valor !== null ? unidade.toLowerCase() : ""}`;
      });
      return `<div>${itens[0]!.axisValue}</div>${linhas.join("<br/>")}`;
    },
  };
}

export const NOME_TENDENCIA = "Tendência linear";
const COR_TENDENCIA = PALETA[1]!;

export function opcaoSerie(nome: string, pontos: Ponto[], unidade: string): EChartsCoreOption {
  const anos = pontos.map((p) => p.ano);
  const tendencia = tendenciaLinear(pontos);
  const reta = tendencia ? pontosDaTendencia(pontos, tendencia) : null;

  const barras = { type: "bar", name: nome, data: pontos.map((p) => p.valor), itemStyle: { borderRadius: [4, 4, 0, 0] }, barMaxWidth: 44 };
  if (!reta) return { ...base(unidade, anos), tooltip: tooltip(unidade, [pontos]), series: [barras] };

  return {
    ...base(unidade, anos),
    legend: { top: 0, right: 0, icon: "roundRect", textStyle: { color: "#14261f" } },
    tooltip: tooltip(unidade, [pontos, reta]),
    series: [
      barras,
      {
        type: "line",
        name: NOME_TENDENCIA,
        data: reta.map((p) => p.valor),
        symbol: "none",
        z: 3,
        lineStyle: { type: "dashed", width: 2.5, color: COR_TENDENCIA },
        itemStyle: { color: COR_TENDENCIA },
      },
    ],
  };
}

export function opcaoComparacao(anos: number[], series: SerieComparada[], unidade: string): EChartsCoreOption {
  return {
    ...base(unidade, anos),
    grid: { left: 8, right: 16, top: 72, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, icon: "roundRect", textStyle: { color: "#14261f" } },
    tooltip: tooltip(unidade, series.map((s) => s.pontos)),
    series: series.map((s) => ({
      type: "bar",
      name: s.nome,
      data: s.pontos.map((p) => p.valor),
      itemStyle: { borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 28,
    })),
  };
}
