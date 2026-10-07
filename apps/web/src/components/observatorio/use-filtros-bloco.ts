"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BlocoObservatorio } from "@/lib/api-types";
import { comFiltro, parametrosDoBloco, semFiltrosDoBloco } from "@/lib/observatorio-url";

export function useFiltrosBloco(bloco: BlocoObservatorio) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ir = (novo: URLSearchParams) => {
    const s = novo.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const atual = new URLSearchParams(sp.toString());
  return {
    qs: parametrosDoBloco(atual, bloco).toString(),
    // `limpar`: filtros dependentes do alterado, que perdem o sentido com o novo valor.
    definir: (chave: string, valor: string | null, limpar: string[] = []) => {
      let novo = comFiltro(atual, bloco, chave, valor);
      for (const k of limpar) novo = comFiltro(novo, bloco, k, null);
      ir(novo);
    },
    padrao: () => ir(semFiltrosDoBloco(atual, bloco)),
  };
}

/** Anos em ordem decrescente para os seletores. */
export function opcoesAnos(anos: number[]): { valor: string; rotulo: string }[] {
  return [...anos].reverse().map((a) => ({ valor: String(a), rotulo: String(a) }));
}

/** 'De' e 'Até' nunca se cruzam: a API responderia 400 para início maior que o fim. */
export function opcoesPeriodo(anos: number[], inicio: number | null, fim: number | null) {
  return {
    de: opcoesAnos(anos.filter((a) => fim === null || a <= fim)),
    ate: opcoesAnos(anos.filter((a) => inicio === null || a >= inicio)),
  };
}
