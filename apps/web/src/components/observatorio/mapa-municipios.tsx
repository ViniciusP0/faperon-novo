"use client";

import * as echarts from "echarts/core";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import type { MunicipioMapa, Opcao } from "@/lib/api-types";
import { optionMapa } from "@/lib/observatorio-graficos";
import { GraficoObservatorio } from "./grafico-observatorio";

let carregamento: Promise<boolean> | null = null;

function carregarMalha(): Promise<boolean> {
  carregamento ??= fetch("/geo/ro-municipios.json")
    .then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      echarts.registerMap("rondonia", await r.json());
      return true;
    })
    .catch(() => {
      carregamento = null;
      return false;
    });
  return carregamento;
}

export function MapaMunicipios({ municipios, unidade, categorias, descricao }: { municipios: MunicipioMapa[]; unidade: string; categorias: Opcao[]; descricao: string }) {
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");
  useEffect(() => {
    let vivo = true;
    void carregarMalha().then((ok) => vivo && setEstado(ok ? "ok" : "erro"));
    return () => { vivo = false; };
  }, []);
  const option = useMemo(() => optionMapa(municipios, unidade, categorias), [municipios, unidade, categorias]);
  if (estado === "erro") return <Alert>Não foi possível carregar o mapa; veja os dados como tabela.</Alert>;
  if (estado === "carregando") return <div role="status" className="h-[460px] animate-pulse rounded-md bg-line/70"><span className="sr-only">Carregando o mapa…</span></div>;
  return <GraficoObservatorio option={option} descricao={descricao} altura={460} />;
}
