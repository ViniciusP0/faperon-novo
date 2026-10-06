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

const gradienteArea = (cor: string) => ({
  color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${cor}66` }, { offset: 1, color: `${cor}08` }] },
});

/** Anota o pico e o último ano com dado (um só ponto quando coincidem). */
function marcas(pontos: Ponto[]) {
  const validos = pontos.filter((p): p is Ponto & { valor: number } => p.valor !== null);
  if (validos.length === 0) return undefined;
  const pico = validos.reduce((a, b) => (b.valor > a.valor ? b : a));
  const ultimo = validos[validos.length - 1]!;
  const alvos = pico.ano === ultimo.ano ? [pico] : [pico, ultimo];
  return {
    symbol: "pin",
    symbolSize: 54,
    label: { color: "#fff", fontSize: 11, formatter: (p: { value: number }) => formatCompacto(p.value) },
    data: alvos.map((p) => ({ coord: [String(p.ano), p.valor] as [string, number], value: p.valor })),
  };
}
const COR_TENDENCIA = PALETA[1]!;

export function opcaoSerie(nome: string, pontos: Ponto[], unidade: string): EChartsCoreOption {
  const anos = pontos.map((p) => p.ano);
  const tendencia = tendenciaLinear(pontos);
  const reta = tendencia ? pontosDaTendencia(pontos, tendencia) : null;

  const area = {
    type: "line",
    name: nome,
    data: pontos.map((p) => p.valor),
    smooth: 0.15,
    symbol: "circle",
    symbolSize: 7,
    lineStyle: { width: 3, color: PALETA[0] },
    itemStyle: { color: PALETA[0] },
    areaStyle: gradienteArea(PALETA[0]!),
    markPoint: marcas(pontos),
  };
  if (!reta) return { ...base(unidade, anos), tooltip: tooltip(unidade, [pontos]), series: [area] };

  return {
    ...base(unidade, anos),
    legend: { top: 0, right: 0, icon: "roundRect", textStyle: { color: "#14261f" } },
    tooltip: tooltip(unidade, [pontos, reta]),
    series: [
      area,
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

/** Acima disso, colunas agrupadas ficam ilegíveis e a comparação passa para linhas. */
const ANOS_MAXIMO_COLUNAS = 6;

export function opcaoComparacao(anos: number[], series: SerieComparada[], unidade: string): EChartsCoreOption {
  return {
    ...base(unidade, anos),
    grid: { left: 8, right: 16, top: 72, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, icon: "roundRect", textStyle: { color: "#14261f" } },
    tooltip: tooltip(unidade, series.map((s) => s.pontos)),
    series: series.map((s) =>
      anos.length > ANOS_MAXIMO_COLUNAS
        ? { type: "line", name: s.nome, data: s.pontos.map((p) => p.valor), smooth: 0.15, symbol: "circle", symbolSize: 6, lineStyle: { width: 3 } }
        : { type: "bar", name: s.nome, data: s.pontos.map((p) => p.valor), itemStyle: { borderRadius: [3, 3, 0, 0] }, barMaxWidth: 28 },
    ),
  };
}

/** Paleta clareada para o fundo escuro (todas acima de 4,5:1 sobre o card escuro). */
export const PALETA_ESCURA = ["#4cc9a6", "#f0a04b", "#7fb8e0", "#c89be0", "#a6d96a"];

const ESCURO = { texto: "#e8f0ec", muted: "#a8bab1", linha: "#2f453b", card: "#172a23" };

type Opcao = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Aplica as cores do tema escuro sobre uma opção já montada (as opções-base seguem as cores do tema claro). */
export function comTemaEscuro(option: EChartsCoreOption): EChartsCoreOption {
  const o = option as Opcao;
  const y = o.yAxis ?? {};
  return {
    ...o,
    color: PALETA_ESCURA,
    xAxis: { ...o.xAxis, axisLabel: { ...o.xAxis?.axisLabel, color: ESCURO.muted }, axisLine: { lineStyle: { color: ESCURO.linha } } },
    yAxis: {
      ...y,
      nameTextStyle: { ...y.nameTextStyle, color: ESCURO.muted },
      axisLabel: { ...y.axisLabel, color: ESCURO.muted },
      splitLine: { lineStyle: { color: ESCURO.linha } },
    },
    ...(o.legend ? { legend: { ...o.legend, textStyle: { color: ESCURO.texto } } } : {}),
    tooltip: { ...o.tooltip, backgroundColor: ESCURO.card, borderColor: ESCURO.linha, textStyle: { color: ESCURO.texto } },
    series: (o.series as Opcao[]).map((s) => {
      if (s.type !== "line") return s;
      if (s.areaStyle) {
        const cor = PALETA_ESCURA[0]!;
        return { ...s, lineStyle: { ...s.lineStyle, color: cor }, itemStyle: { ...s.itemStyle, color: cor }, areaStyle: gradienteArea(cor) };
      }
      if (s.name === NOME_TENDENCIA) {
        return { ...s, lineStyle: { ...s.lineStyle, color: PALETA_ESCURA[1] }, itemStyle: { ...s.itemStyle, color: PALETA_ESCURA[1] } };
      }
      return s; // linhas da comparação seguem a paleta escura do option.color
    }),
  };
}
