import { afterEach, describe, expect, it, vi } from "vitest";
import { obterEstado, partesDoTexto, perguntar, baseDoZetele } from "./zetele";

afterEach(() => vi.unstubAllGlobals());

const json = (corpo: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json", ...headers } });

describe("partesDoTexto", () => {
  it("separa texto e links Markdown internos e https", () => {
    expect(partesDoTexto("Veja [o Painel](/painel) e [o IBGE](https://sidra.ibge.gov.br/Tabela/5457).")).toEqual([
      { tipo: "texto", texto: "Veja " },
      { tipo: "link", texto: "o Painel", href: "/painel" },
      { tipo: "texto", texto: " e " },
      { tipo: "link", texto: "o IBGE", href: "https://sidra.ibge.gov.br/Tabela/5457" },
      { tipo: "texto", texto: "." },
    ]);
  });

  it("não vira link o que não é rota interna nem https", () => {
    expect(partesDoTexto("[x](javascript:alert(1))")).toEqual([{ tipo: "texto", texto: "[x](javascript:alert(1))" }]);
  });

  it("não trata //host como rota interna", () => {
    expect(partesDoTexto("[x](//golpe.example)")).toEqual([{ tipo: "texto", texto: "[x](//golpe.example)" }]);
  });
});

describe("cliente da API", () => {
  it("obterEstado cai para indisponível se a API falhar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    expect(await obterEstado()).toEqual({ disponivel: false, motivo: "indisponivel" });
  });

  it("cada área fala com o próprio Zétele no servidor", async () => {
    expect(baseDoZetele("/painel")).toMatch(/\/zetele$/);
    expect(baseDoZetele("/painel")).not.toMatch(/sistema/);
    expect(baseDoZetele("/sistema/espacos")).toMatch(/\/sistema\/zetele$/);
    const f = vi.fn().mockResolvedValue(json({ status: "respondida", texto: "ok", fontes: [], sugestoes: [] }));
    vi.stubGlobal("fetch", f);
    await perguntar("x", [], "/sistema/contas");
    expect(String(f.mock.calls[0]![0])).toMatch(/\/sistema\/zetele\/perguntar$/);
    await obterEstado("/sistema");
    expect(String(f.mock.calls[1]![0])).toMatch(/\/sistema\/zetele\/estado$/);
  });

  it("perguntar envia só as últimas 6 mensagens e lê a resposta", async () => {
    const f = vi.fn().mockResolvedValue(json({ status: "respondida", texto: "ok", fontes: [], sugestoes: [] }));
    vi.stubGlobal("fetch", f);
    const historico = Array.from({ length: 8 }, (_, i) => ({ papel: "visitante" as const, texto: String(i) }));
    const r = await perguntar("x", historico, "/painel");
    expect(r).toEqual({ tipo: "ok", resposta: { status: "respondida", texto: "ok", fontes: [], sugestoes: [] } });
    const corpo = JSON.parse(f.mock.calls[0]![1].body as string);
    expect(corpo.historico).toHaveLength(6);
    expect(corpo.pagina).toBe("/painel");
  });

  it("429 vira espera com o Retry-After; 503 traz o motivo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ erro: "x", campos: {} }, 429, { "retry-after": "12" })));
    expect(await perguntar("x", [], "/")).toEqual({ tipo: "espera", segundos: 12 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ erro: "x", motivo: "orcamento_diario" }, 503)));
    expect(await perguntar("x", [], "/")).toEqual({ tipo: "indisponivel", motivo: "orcamento_diario" });
  });
});
