import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { CENTRAL } from "./central";
import { CONTATO } from "./contato";
import { OBSERVATORIO } from "./observatorio";
import { ORDEM_POR_PAGINA, PAGINAS_COM_ZETELE, PERGUNTAS, ehPaginaComZetele, perguntasDaPagina } from "./zetele";

// Mesmo padrão de content.test.ts: no jsdom, import.meta.url não é file://.
const SITE_MD = path.resolve(__dirname, "../../../api/zetele/conhecimento/site.md");
const ROTAS = sitemap().map((e) => new URL(e.url).pathname);

describe("Zétele: conteúdo", () => {
  it("aparece exatamente no Início, na Central, no Observatório e no Painel", () => {
    expect([...PAGINAS_COM_ZETELE].sort()).toEqual(["/", "/central-de-inteligencia", "/central-de-inteligencia/observatorio", "/painel"]);
    expect(ehPaginaComZetele("/painel")).toBe(true);
    expect(ehPaginaComZetele("/sobre")).toBe(false);
    expect(ehPaginaComZetele(null)).toBe(false);
  });

  it("tem 8 perguntas prontas; as estáticas têm resposta e link para página que existe", () => {
    expect(PERGUNTAS).toHaveLength(8);
    for (const p of PERGUNTAS.filter((q) => q.tipo === "estatica")) {
      expect(p.resposta, p.id).toBeTruthy();
      expect(ROTAS, p.id).toContain(p.href);
    }
  });

  it("cada página mostra 4 perguntas que existem, e o resto vai para 'mais sugestões'", () => {
    for (const pagina of PAGINAS_COM_ZETELE) {
      const { visiveis, demais } = perguntasDaPagina(pagina);
      expect(visiveis.map((p) => p.id)).toEqual(ORDEM_POR_PAGINA[pagina]);
      expect(visiveis.length + demais.length).toBe(PERGUNTAS.length);
    }
  });

  it("respostas estáticas usam os contatos reais", () => {
    const contato = PERGUNTAS.find((p) => p.id === "contato")!;
    expect(contato.resposta).toContain(CONTATO.telefone.texto);
    expect(contato.resposta).toContain(CONTATO.whatsapp.texto);
  });

  it("a resposta dos Informativos não rebaixa nome próprio a minúscula", () => {
    const informativos = PERGUNTAS.find((p) => p.id === "informativos")!;
    expect(informativos.resposta).toContain("Rondônia");
  });
});

describe("Zétele: base de conhecimento (site.md) acompanha o site", () => {
  const md = readFileSync(SITE_MD, "utf-8");

  it("cita toda rota do sitemap", () => {
    for (const rota of ROTAS) expect(md, rota).toContain(`## [${rota}]`);
  });

  it("tem os telefones, as portas da Central e os blocos do Observatório", () => {
    expect(md).toContain(CONTATO.telefone.texto);
    expect(md).toContain(CONTATO.whatsapp.texto);
    for (const porta of CENTRAL.portas) expect(md).toContain(porta.titulo);
    for (const secao of OBSERVATORIO.secoes) expect(md).toContain(secao.titulo);
  });
});
