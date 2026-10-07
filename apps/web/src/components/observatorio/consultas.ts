"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { BlocoObservatorio } from "@/lib/api-types";

export function useBlocoObservatorio<B extends BlocoObservatorio>(bloco: B, qs: string) {
  return useQuery({ queryKey: ["observatorio", bloco, qs], queryFn: () => api.observatorio(bloco, qs), placeholderData: keepPreviousData });
}

/** Guarda os últimos filtros recebidos: os seletores seguem montados enquanto a próxima consulta carrega ou falha. */
export function useFiltrosLembrados<F>(atual: F | undefined): F | undefined {
  const [ultimo, setUltimo] = useState<F | undefined>(atual);
  if (atual !== undefined && atual !== ultimo) setUltimo(atual);
  return atual ?? ultimo;
}
