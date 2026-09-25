import type { Informativo } from "@/content/informativos";

const anoDe = (item: Informativo) => Number(item.data.slice(0, 4));

export function maisRecente(itens: Informativo[]): Informativo {
  return itens.reduce((a, b) => (b.data > a.data ? b : a));
}

export function anosDisponiveis(itens: Informativo[]): number[] {
  return [...new Set(itens.map(anoDe))].sort((a, b) => b - a);
}

export interface GrupoAno {
  ano: number;
  itens: Informativo[];
}

/** Agrupa por ano (mais novo primeiro); com `ano`, devolve só esse ano. */
export function agruparPorAno(itens: Informativo[], ano?: number): GrupoAno[] {
  return anosDisponiveis(itens)
    .filter((a) => ano === undefined || a === ano)
    .map((a) => ({ ano: a, itens: itens.filter((i) => anoDe(i) === a).sort((x, y) => (x.data < y.data ? 1 : -1)) }));
}
