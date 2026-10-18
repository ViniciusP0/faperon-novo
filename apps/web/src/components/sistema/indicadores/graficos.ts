import type { EChartsCoreOption } from "echarts/core";
import { escapar } from "@/lib/format";
import { CORES_CATEGORIA, CORES_CATEGORIA_ESCURA } from "@/lib/observatorio-graficos";
import { LEGENDA } from "@/lib/sistema/legenda";
import type { TipoLegenda } from "@/lib/sistema/tipos";

/** Cores dos gráficos dos Indicadores: os tokens do tema (globals.css) lidos na hora, para seguir claro e escuro.
 *  Sem a paleta padrão do ECharts: o tipo usa a cor da legenda única; categorias, a paleta categórica do site. */
export interface CoresDoTema {
  texto: string;
  muted: string;
  linha: string;
  card: string;
  /** Série única (horas, km, público). */
  marca: string;
  tipo: Record<TipoLegenda, string>;
  /** Por índice fixo: a cor segue a entidade (a categoria), nunca a posição no ranking. */
  categorias: string[];
}

const CLARO = { texto: "#14261f", muted: "#46564f", linha: "#d3e1d8", card: "#ffffff", marca: "#00604e" };
const ESCURO = { texto: "#e8f0ec", muted: "#a8bab1", linha: "#2f453b", card: "#172a23", marca: "#6fd1b0" };
const TIPO_CLARO: Record<TipoLegenda, string> = {
  reuniao: "#00604e",
  viagem: "#2b5672",
  compromisso: "#6b3a6e",
  capacitacao: "#7a5210",
  palestra: "#8a2442",
  institucional: "#3b5d17",
  visita_tecnica: "#0a5a6e",
  atendimento: "#8f3b1c",
  administrativo: "#3d434a",
  outro: "#565e5a",
};

export function lerCores(escuro: boolean): CoresDoTema {
  const base = escuro ? ESCURO : CLARO;
  const estilo = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
  const token = (nome: string, padrao: string) => estilo?.getPropertyValue(`--${nome}`).trim() || padrao;
  const tipo = Object.fromEntries(
    (Object.keys(TIPO_CLARO) as TipoLegenda[]).map((t) => [t, token(`tipo-${t.replace("_", "-")}`, TIPO_CLARO[t])]),
  ) as Record<TipoLegenda, string>;
  return {
    texto: token("ink", base.texto),
    muted: token("ink-muted", base.muted),
    linha: token("line", base.linha),
    card: token("card", base.card),
    marca: token("brand-fg", base.marca),
    tipo,
    categorias: escuro ? CORES_CATEGORIA_ESCURA : CORES_CATEGORIA,
  };
}

export const corDoTipo = (cores: CoresDoTema, tipo: TipoLegenda) => cores.tipo[tipo];
export const rotuloDoTipo = (tipo: TipoLegenda) => LEGENDA[tipo];

export interface Serie {
  nome: string;
  valores: number[];
  /** Uma cor para a série toda ou uma por barra (o tipo de cada barra). */
  cor: string | string[];
}

interface Barras {
  eixo: string[];
  series: Serie[];
  /** Barras deitadas (rótulos longos, ranking); de pé para meses. */
  deitadas?: boolean;
  formatar: (v: number) => string;
  cores: CoresDoTema;
  /** Linha extra do tooltip por posição do eixo (ex.: "3 viagens" no mês). */
  extra?: (i: number) => string;
}

/** Barras finas, ponta arredondada só no fim do dado, 2 px de respiro entre segmentos empilhados, grade discreta. */
export function opcaoBarras({ eixo, series, deitadas = false, formatar, cores, extra }: Barras): EChartsCoreOption {
  const fonte = { fontFamily: "Poppins, system-ui, sans-serif" };
  const categoria = {
    type: "category",
    data: eixo,
    inverse: deitadas,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: cores.linha } },
    axisLabel: { color: cores.muted, ...(deitadas ? { width: 150, overflow: "truncate" } : {}) },
  };
  const valor = {
    type: "value",
    axisLabel: { color: cores.muted, formatter: (v: number) => formatar(v) },
    splitLine: { lineStyle: { color: cores.linha } },
    splitNumber: 3,
  };
  const pilha = series.length > 1;
  const ponta = deitadas ? [0, 4, 4, 0] : [4, 4, 0, 0];
  return {
    animation: false,
    textStyle: fonte,
    grid: { left: 4, right: 20, top: pilha ? 36 : 12, bottom: 4, containLabel: true },
    ...(pilha ? { legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 12, itemHeight: 12, textStyle: { color: cores.texto } } } : {}),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(127, 140, 134, 0.12)" } },
      backgroundColor: cores.card,
      borderColor: cores.linha,
      textStyle: { color: cores.texto },
      formatter: (params: unknown) => {
        const itens = (params as { axisValue: string; dataIndex: number; seriesName: string; value: number; marker: string }[]).filter((p) => p.value > 0 || !pilha);
        const primeiro = (params as { axisValue: string; dataIndex: number }[])[0];
        if (!primeiro) return "";
        const linhas = itens.map((p) => `${pilha ? `${p.marker} ${escapar(p.seriesName)}: ` : ""}<strong>${escapar(formatar(p.value))}</strong>`);
        const mais = extra?.(primeiro.dataIndex);
        return [`<div>${escapar(primeiro.axisValue)}</div>`, ...linhas, ...(mais ? [escapar(mais)] : [])].join("<br/>");
      },
    },
    xAxis: deitadas ? valor : categoria,
    yAxis: deitadas ? categoria : valor,
    series: series.map((s, i) => ({
      type: "bar",
      name: s.nome,
      stack: pilha ? "total" : undefined,
      barMaxWidth: deitadas ? 18 : 28,
      data: s.valores.map((v, j) => ({
        value: v,
        itemStyle: {
          color: Array.isArray(s.cor) ? s.cor[j] : s.cor,
          // só o último segmento leva a ponta arredondada; o contorno da cor do cartão separa os segmentos
          borderRadius: !pilha || i === series.length - 1 ? ponta : 0,
          ...(pilha ? { borderColor: cores.card, borderWidth: 1.5 } : {}),
        },
      })),
      emphasis: { focus: pilha ? "series" : "none" },
    })),
  };
}

/** Altura das barras deitadas: cresce com o número de linhas, para nenhuma ficar espremida. */
export const alturaDeitadas = (linhas: number, legenda = false) => Math.max(140, linhas * 34 + (legenda ? 64 : 36));
