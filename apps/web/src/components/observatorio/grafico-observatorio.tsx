"use client";

import { MapChart, TreemapChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { Grafico } from "@/components/painel/grafico";

// Registra só o que o Observatório acrescenta; o Grafico registra o restante antes do init.
echarts.use([MapChart, TreemapChart, VisualMapComponent]);

export function GraficoObservatorio({ option, descricao, altura = 360, idEntrada }: { option: EChartsCoreOption; descricao: string; altura?: number; idEntrada?: string }) {
  return <Grafico option={option} descricao={descricao} altura={altura} alturaMovel={Math.min(altura, 320)} idEntrada={idEntrada} />;
}
