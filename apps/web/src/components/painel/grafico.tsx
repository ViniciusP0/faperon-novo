"use client";

import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

interface GraficoProps {
  option: echarts.EChartsCoreOption;
  descricao: string;
  altura?: number;
}

export function Grafico({ option, descricao, altura = 360 }: GraficoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const instancia = echarts.init(el, undefined, { renderer: "svg" });
    chart.current = instancia;
    const observer = new ResizeObserver(() => instancia.resize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      instancia.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} role="img" aria-label={descricao} style={{ height: altura, width: "100%" }} data-testid="grafico" />;
}
