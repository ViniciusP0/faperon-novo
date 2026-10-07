"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BlocoObservatorio } from "@/lib/api-types";

export function useBlocoObservatorio<B extends BlocoObservatorio>(bloco: B, qs: string) {
  return useQuery({ queryKey: ["observatorio", bloco, qs], queryFn: () => api.observatorio(bloco, qs) });
}

export const usePanorama = (qs: string) => useBlocoObservatorio("panorama", qs);
export const useCrescimento = (qs: string) => useBlocoObservatorio("crescimento", qs);
export const useTerritorio = (qs: string) => useBlocoObservatorio("territorio", qs);
export const usePecuaria = (qs: string) => useBlocoObservatorio("pecuaria", qs);
