import { describe, expect, it } from "vitest";
import { lerFeed, lerHome } from "./importar-noticias-wix.mjs";

const item = (titulo, categorias = "") =>
  `<item><title><![CDATA[${titulo}]]></title><description><![CDATA[Resumo]]></description><link>https://www.faperon.com.br/post/${encodeURIComponent(titulo)}</link><pubDate>Thu, 17 Sep 2026 21:35:05 GMT</pubDate>${categorias}</item>`;
const feed = (...itens) => `<?xml version="1.0"?><rss><channel>${itens.join("")}</channel></rss>`;

describe("lerFeed: categorias", () => {
  it("lê as categorias do item, em CDATA e sem CDATA, na ordem do feed", () => {
    const [n] = lerFeed(feed(item("A", "<category><![CDATA[Geral]]></category><category>Faperon</category>")));
    expect(n.categorias).toEqual(["Geral", "Faperon"]);
  });

  it("descarta categorias repetidas e vazias", () => {
    const [n] = lerFeed(feed(item("A", "<category>Faperon</category><category>Faperon</category><category>  </category>")));
    expect(n.categorias).toEqual(["Faperon"]);
  });

  it("item sem categoria fica com lista vazia", () => {
    const [n] = lerFeed(feed(item("A")));
    expect(n.categorias).toEqual([]);
  });

  it("decodifica entidades no nome da categoria", () => {
    const [n] = lerFeed(feed(item("A", "<category>Pesquisa &amp; Dados</category>")));
    expect(n.categorias).toEqual(["Pesquisa & Dados"]);
  });

  it("cada item guarda só as suas categorias", () => {
    const [a, b] = lerFeed(feed(item("A", "<category>Geral</category>"), item("B", "<category>Faperon</category>")));
    expect(a.categorias).toEqual(["Geral"]);
    expect(b.categorias).toEqual(["Faperon"]);
  });
});

describe("lerHome (reserva)", () => {
  it("devolve categorias vazias, porque a home não informa categoria", () => {
    const [n] = lerHome('<a href="https://www.faperon.com.br/post/uma-noticia">Uma notícia</a>');
    expect(n.categorias).toEqual([]);
  });
});
