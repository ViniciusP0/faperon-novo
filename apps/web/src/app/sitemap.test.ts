import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("inclui as páginas institucionais internas", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual(
      ["/", "/central-de-inteligencia", "/painel", "/sobre", "/informativos-tecnicos", "/noticias", "/fale-conosco", "/ipagro", "/sindicatos-rurais", "/comissao-mulheres", "/politica-de-privacidade"].map(
        (caminho) => `${SITE_URL}${caminho}`,
      ),
    );
  });
});
