"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { recorteParams, type Filtros } from "@/lib/filters";

// As seções e os cards do topo consultam as mesmas chaves: o React Query faz uma única requisição por recorte.

export function useRanking(filtros: Filtros) {
  const qs = recorteParams(filtros).toString();
  return useQuery({ queryKey: ["ranking", qs], queryFn: () => api.ranking(qs) });
}

function paramsComTerritorio(filtros: Filtros): string {
  const params = recorteParams(filtros);
  if (filtros.municipio) params.set("municipio", filtros.municipio);
  return params.toString();
}

export function useSerie(filtros: Filtros) {
  const qs = paramsComTerritorio(filtros);
  return useQuery({ queryKey: ["serie", qs], queryFn: () => api.serie(qs) });
}

export function useAnalise(filtros: Filtros) {
  const qs = paramsComTerritorio(filtros);
  return useQuery({ queryKey: ["analise", qs], queryFn: () => api.analise(qs) });
}
