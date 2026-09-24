import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CENTRAL } from "./central";
import { INICIO } from "./inicio";
import { NOTICIAS, noticiasRecentes } from "./noticias";

const PUBLIC = path.resolve(__dirname, "../../public");

describe("notícias", () => {
  it("traz as 20 notícias importadas do Wix, com slugs únicos", () => {
    expect(NOTICIAS).toHaveLength(20);
    expect(new Set(NOTICIAS.map((n) => n.slug)).size).toBe(NOTICIAS.length);
  });

  it("tem datas ISO válidas e ordem da mais recente para a mais antiga", () => {
    for (const n of NOTICIAS) {
      expect(n.data, n.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(`${n.data}T12:00:00Z`)), n.slug).toBe(false);
    }
    const datas = NOTICIAS.map((n) => n.data);
    expect(datas).toEqual([...datas].sort().reverse());
    expect(noticiasRecentes(3).map((n) => n.slug)).toEqual(NOTICIAS.slice(0, 3).map((n) => n.slug));
  });

  it("tem título, resumo e link do site atual em todas", () => {
    for (const n of NOTICIAS) {
      expect(n.titulo.length, n.slug).toBeGreaterThan(10);
      expect(n.resumo.length, n.slug).toBeGreaterThan(0);
      expect(n.url_original, n.slug).toMatch(/^https:\/\/www\.faperon\.com\.br\/post\//);
    }
  });

  it("aponta só para imagens que existem em public/noticias", () => {
    const comImagem = NOTICIAS.filter((n) => n.imagem !== null);
    expect(comImagem.length).toBeGreaterThanOrEqual(19);
    for (const n of comImagem) {
      expect(n.imagem, n.slug).toMatch(/^\/noticias\/[a-z0-9-]+\.(jpg|png|webp)$/);
      expect(existsSync(path.join(PUBLIC, n.imagem!)), n.imagem!).toBe(true);
    }
    for (const n of noticiasRecentes(3)) expect(n.imagem, n.slug).not.toBeNull();
  });
});

describe("Início e Central", () => {
  it("usa o link de preços das commodities da CNA", () => {
    expect(INICIO.commodities.url).toBe("https://www.cnabrasil.org.br/servicos/precos-commodities");
    expect(INICIO.central.cta_url).toBe("/central-de-inteligencia");
    expect(INICIO.nosso_agro.titulo).toBe("Nosso Agro");
  });

  it("descreve os seis blocos do painel sem HTML solto", () => {
    expect(CENTRAL.blocos).toHaveLength(6);
    expect(CENTRAL.paragrafos.every((p) => !p.includes("<"))).toBe(true);
    expect(CENTRAL.cta_url).toBe("/painel");
  });
});
