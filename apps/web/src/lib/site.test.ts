import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HERO } from "@/content/hero";
import { LINKS_INSTITUCIONAIS, MENU, ROTAS, WIX_PAGINAS } from "./site";

const APP = path.resolve(__dirname, "../app");

describe("páginas institucionais internas", () => {
  it("Sobre, Informativos Técnicos e Fale Conosco são rotas internas do menu", () => {
    expect(MENU.map((i) => [i.label, i.href])).toEqual([
      ["Início", "/"],
      ["Central de Inteligência", "/central-de-inteligencia"],
      ["Painel Agro RO", "/painel"],
      ["Sobre", "/sobre"],
      ["Informativos Técnicos", "/informativos-tecnicos"],
      ["Fale Conosco", "/fale-conosco"],
    ]);
    expect(MENU.some((i) => i.externo)).toBe(false);
  });

  it("toda rota interna do menu tem page.tsx (evita 404)", () => {
    for (const { href } of MENU.filter((i) => i.href !== "/"))
      expect(existsSync(path.join(APP, href, "page.tsx")), href).toBe(true);
  });

  it("o CTA 'Conheça a FAPERON' leva à página Sobre interna", () => {
    expect(HERO.faperon.cta_url).toBe(ROTAS.sobre);
  });

  it("nenhum link interno usa os endereços /blank-* do Wix", () => {
    const hrefs = [...MENU, ...LINKS_INSTITUCIONAIS].map((i) => i.href);
    expect(hrefs.some((h) => /\/blank-\d+/.test(h))).toBe(false);
  });
});

describe("links que continuam no site atual (Wix)", () => {
  it("usam os endereços reais conferidos no Wix", () => {
    expect(WIX_PAGINAS).toEqual({
      noticias: "https://www.faperon.com.br/blog",
      transparencia: "https://www.faperon.com.br/portaldatranspar%C3%AAncia",
    });
    expect(LINKS_INSTITUCIONAIS.map((i) => i.href)).toContain(WIX_PAGINAS.transparencia);
  });
});
