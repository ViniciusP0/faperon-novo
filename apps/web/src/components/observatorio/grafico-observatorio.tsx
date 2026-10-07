"use client";

import { MapChart, TreemapChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";
import { Grafico } from "@/components/painel/grafico";
import { useEscuro } from "./use-escuro";

// Registra só o que o Observatório acrescenta; o Grafico registra o restante antes do init.
echarts.use([MapChart, TreemapChart, VisualMapComponent]);

export type OpcaoDoTema = EChartsCoreOption | ((escuro: boolean) => EChartsCoreOption);

/**
 * As opções do Observatório trazem as próprias cores de cada tema (lib/observatorio-graficos), por isso o Grafico
 * não aplica comTemaEscuro: ele presume eixos e uma única área, o que quebraria mapa, treemap e áreas empilhadas.
 * Passe uma função `(escuro) => option` para receber o tema atual.
 */
export function GraficoObservatorio({ option, descricao, altura = 360, idEntrada }: { option: OpcaoDoTema; descricao: string; altura?: number; idEntrada?: string }) {
  const escuro = useEscuro();
  const resolvida = useMemo(() => (typeof option === "function" ? option(escuro) : option), [option, escuro]);
  return <Grafico option={resolvida} descricao={descricao} altura={altura} alturaMovel={Math.min(altura, 320)} idEntrada={idEntrada} temaProprio />;
}
