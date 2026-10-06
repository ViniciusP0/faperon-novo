"use client";

import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkPointComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { comEntrada, comTemaEscuro } from "@/lib/chart-options";
import { reducaoDeMovimento } from "@/lib/movimento";
import { consumirEntrada } from "./entrada-grafico";
import { temaAtual } from "@/lib/tema";

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, MarkPointComponent, TooltipComponent, SVGRenderer]);

interface GraficoProps {
  option: echarts.EChartsCoreOption;
  descricao: string;
  altura?: number;
  /** Altura no celular; por padrão, a mesma do desktop. */
  alturaMovel?: number;
  /** Identifica o gráfico; a animação de entrada toca uma única vez por identificador, mesmo que ele remonte. */
  idEntrada?: string;
}

export function Grafico({ option, descricao, altura = 360, alturaMovel = altura, idEntrada }: GraficoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const desenhou = useRef(false);
  const [escuro, setEscuro] = useState(false);

  // Acompanha o tema do site (atributo data-theme em <html>), inclusive quando o visitante alterna com a página aberta.
  useEffect(() => {
    const ler = () => setEscuro(temaAtual() === "escuro");
    ler();
    const obs = new MutationObserver(ler);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

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
    const base = escuro ? comTemaEscuro(option) : option;
    // Só a primeira renderização anima; filtros e troca de tema reaplicam a opção na hora.
    chart.current?.setOption(comEntrada(base, !desenhou.current && consumirEntrada(idEntrada) && !reducaoDeMovimento()), true);
    desenhou.current = true;
  }, [option, escuro, idEntrada]);

  return <div
      ref={ref}
      role="img"
      aria-label={descricao}
      className="h-[var(--h-movel)] w-full md:h-[var(--h-desktop)]"
      style={{ "--h-movel": `${alturaMovel}px`, "--h-desktop": `${altura}px` } as CSSProperties}
      data-testid="grafico"
    />;
}
