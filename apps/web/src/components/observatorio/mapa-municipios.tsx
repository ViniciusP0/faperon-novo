"use client";

import * as echarts from "echarts/core";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import type { MunicipioMapa, Opcao } from "@/lib/api-types";
import { COR_SEM_DADO, COR_SEM_DADO_ESCURO, optionMapa } from "@/lib/observatorio-graficos";
import { GraficoObservatorio } from "./grafico-observatorio";
import { useEscuro } from "./use-escuro";

let carregamento: Promise<boolean> | null = null;
let malhaPronta = false;

function carregarMalha(): Promise<boolean> {
  carregamento ??= fetch("/geo/ro-municipios.json")
    .then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      echarts.registerMap("rondonia", await r.json());
      malhaPronta = true;
      return true;
    })
    .catch(() => {
      carregamento = null;
      return false;
    });
  return carregamento;
}

export function MapaMunicipios({ municipios, unidade, categorias, descricao }: { municipios: MunicipioMapa[]; unidade: string; categorias: Opcao[]; descricao: string }) {
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">(malhaPronta ? "ok" : "carregando");
  const escuro = useEscuro();
  useEffect(() => {
    let vivo = true;
    void carregarMalha().then((ok) => vivo && setEstado(ok ? "ok" : "erro"));
    return () => { vivo = false; };
  }, []);
  const option = useCallback((e: boolean) => optionMapa(municipios, unidade, categorias, e), [municipios, unidade, categorias]);
  if (estado === "erro") return <Alert>Não foi possível carregar o mapa; veja os dados como tabela.</Alert>;
  if (estado === "carregando") return <div role="status" className="h-[460px] animate-pulse rounded-md bg-line/70"><span className="sr-only">Carregando o mapa…</span></div>;
  const haSemDado = municipios.some((m) => m.status !== "ok");
  return (
    <div>
      <GraficoObservatorio option={option} descricao={descricao} altura={460} />
      {haSemDado && (
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
          <span aria-hidden="true" data-testid="chave-sem-dado" className="inline-block h-3.5 w-3.5 rounded-sm border border-line" style={{ backgroundColor: escuro ? COR_SEM_DADO_ESCURO : COR_SEM_DADO }} />
          Sigiloso ou sem dado
        </p>
      )}
    </div>
  );
}
