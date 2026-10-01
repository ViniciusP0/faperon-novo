import type { Categoria, Informativo } from "@/content/informativos";

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

export type TipoLivro = "corte" | "leite" | "boletim";

/** Dados mínimos para desenhar a capa e a pré-visualização de uma edição como livro. */
export interface LivroInfo {
  titulo: string;
  data: string;
  url: string;
  tipo: TipoLivro;
  /** Nome completo da categoria (ex.: "Bovinocultura de Corte"). */
  categoria: string;
  /** Rótulo curto, usado na lombada. */
  curto: string;
}

export interface TextosCapa {
  tipo: string;
  mes: string;
  ano: string;
  lombada: string;
}

/** Edição mensal ("Dezembro/2025") ou boletim ("Boletim Bovinocultura de Corte 2024.2") como livro. */
export function textosDaCapa(livro: LivroInfo): TextosCapa {
  if (livro.tipo === "boletim") {
    const edicao = livro.titulo.match(/\d{4}\.\d/)?.[0] ?? livro.titulo;
    return { tipo: "Boletim técnico", mes: edicao, ano: "Edição", lombada: `BOLETIM ${edicao}` };
  }
  const [mes = livro.titulo, ano = ""] = livro.titulo.split("/");
  return { tipo: "Informativo mensal", mes, ano, lombada: `${livro.curto.toUpperCase()} · ${mes.slice(0, 3).toUpperCase()} ${ano}` };
}

type CategoriaResumo = Pick<Categoria, "id" | "titulo" | "curto">;

export function livroDoInformativo(item: Informativo, categoria: CategoriaResumo): LivroInfo {
  return { titulo: item.titulo, data: item.data, url: item.url, tipo: categoria.id, categoria: categoria.titulo, curto: categoria.curto };
}

export function livroDoBoletim(boletim: Informativo & { categoria: Categoria["id"] }, categorias: readonly CategoriaResumo[]): LivroInfo {
  const categoria = categorias.find((c) => c.id === boletim.categoria);
  return { titulo: boletim.titulo, data: boletim.data, url: boletim.url, tipo: "boletim", categoria: categoria?.titulo ?? "", curto: categoria?.curto ?? "" };
}
