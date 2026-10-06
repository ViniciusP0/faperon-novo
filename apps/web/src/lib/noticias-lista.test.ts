import { describe, expect, it } from "vitest";
import type { Noticia } from "@/content/noticias";
import { POR_PAGINA, categoriasDisponiveis, hrefLista, listarNoticias, slugCategoria } from "./noticias-lista";

const n = (i: number, categorias: string[]): Noticia => ({
  slug: `n-${i}`,
  titulo: `Notícia ${i}`,
  resumo: "r",
  data: `2026-01-${String(30 - i).padStart(2, "0")}`,
  imagem: null,
  url_original: `https://www.faperon.com.br/post/n-${i}`,
  categorias,
});

// 17 "Faperon" (4 também "Geral"), 8 só "Geral", 2 sem categoria = 27 notícias
const NOTICIAS: Noticia[] = [
  ...Array.from({ length: 13 }, (_, i) => n(i, ["Faperon"])),
  ...Array.from({ length: 4 }, (_, i) => n(13 + i, ["Faperon", "Geral"])),
  ...Array.from({ length: 8 }, (_, i) => n(17 + i, ["Geral"])),
  n(25, []),
  n(26, []),
];

describe("slugCategoria", () => {
  it("usa minúsculas, sem acento e com hífen", () => {
    expect(slugCategoria("Faperon")).toBe("faperon");
    expect(slugCategoria("Pesquisa e Extensão")).toBe("pesquisa-e-extensao");
  });
});

describe("categoriasDisponiveis", () => {
  it("lista as categorias presentes, em ordem alfabética, com a contagem", () => {
    expect(categoriasDisponiveis(NOTICIAS)).toEqual([
      { slug: "faperon", nome: "Faperon", total: 17 },
      { slug: "geral", nome: "Geral", total: 12 },
    ]);
  });

  it("sem notícias, não há categorias", () => {
    expect(categoriasDisponiveis([])).toEqual([]);
  });
});

describe("listarNoticias", () => {
  it("sem filtro mostra todas, 12 por página, na ordem recebida", () => {
    const r = listarNoticias(NOTICIAS, {});
    expect(POR_PAGINA).toBe(12);
    expect(r).toMatchObject({ total: 27, pagina: 1, totalPaginas: 3, categoria: null });
    expect(r.itens).toHaveLength(12);
    expect(r.itens[0]!.slug).toBe("n-0");
  });

  it("a última página traz o resto", () => {
    const r = listarNoticias(NOTICIAS, { pagina: "3" });
    expect(r.pagina).toBe(3);
    expect(r.itens).toHaveLength(3);
  });

  it("filtra por categoria e conta só as dela", () => {
    const r = listarNoticias(NOTICIAS, { categoria: "geral" });
    expect(r.total).toBe(12);
    expect(r.categoria).toEqual({ slug: "geral", nome: "Geral", total: 12 });
    expect(r.itens.every((x) => x.categorias.includes("Geral"))).toBe(true);
    expect(r.totalPaginas).toBe(1);
  });

  it("aceita a categoria com acento ou maiúsculas, como na URL digitada à mão", () => {
    expect(listarNoticias(NOTICIAS, { categoria: "GERAL" }).total).toBe(12);
  });

  it("categoria desconhecida vira Todas", () => {
    const r = listarNoticias(NOTICIAS, { categoria: "inexistente" });
    expect(r.total).toBe(27);
    expect(r.categoria).toBeNull();
  });

  it("página inválida (não numérica, zero, negativa, decimal) vira 1", () => {
    for (const p of ["abc", "0", "-3", "1.5", "", "NaN"]) expect(listarNoticias(NOTICIAS, { pagina: p }).pagina).toBe(1);
  });

  it("página além da última mostra a última", () => {
    expect(listarNoticias(NOTICIAS, { pagina: "99" })).toMatchObject({ pagina: 3, totalPaginas: 3 });
    expect(listarNoticias(NOTICIAS, { categoria: "geral", pagina: "99" }).pagina).toBe(1);
  });

  it("valores repetidos na URL (?pagina=2&pagina=3) usam o primeiro", () => {
    expect(listarNoticias(NOTICIAS, { pagina: ["2", "3"] }).pagina).toBe(2);
    expect(listarNoticias(NOTICIAS, { categoria: ["geral", "faperon"] }).categoria?.slug).toBe("geral");
  });

  it("sem notícias devolve lista vazia e 1 página, sem quebrar", () => {
    expect(listarNoticias([], { pagina: "5", categoria: "geral" })).toEqual({ itens: [], total: 0, pagina: 1, totalPaginas: 1, categoria: null });
  });
});

describe("hrefLista", () => {
  it("monta o endereço omitindo o que é padrão", () => {
    expect(hrefLista({})).toBe("/noticias");
    expect(hrefLista({ pagina: 1 })).toBe("/noticias");
    expect(hrefLista({ categoria: "geral" })).toBe("/noticias?categoria=geral");
    expect(hrefLista({ categoria: "faperon", pagina: 2 })).toBe("/noticias?categoria=faperon&pagina=2");
    expect(hrefLista({ pagina: 3 })).toBe("/noticias?pagina=3");
  });
});
