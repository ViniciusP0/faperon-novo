import { afterEach, describe, expect, it, vi } from "vitest";
import { ipDoCliente, proxyParaApi } from "./proxy";

afterEach(() => vi.unstubAllGlobals());

describe("proxyParaApi", () => {
  it("repassa ao Django só o IP que o Funnel acrescentou, nunca a cadeia forjada", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    await proxyParaApi(
      new Request("http://site.test/api/v1/relatorio.pdf", {
        headers: { "x-forwarded-for": "6.6.6.6, 7.7.7.7, 203.0.113.9" },
      }),
    );
    const enviados = fetchFalso.mock.calls[0]![1].headers as Headers;
    expect(enviados.get("x-forwarded-for")).toBe("203.0.113.9");
  });

  it("sem x-forwarded-for na entrada, não inventa o header na saída", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    await proxyParaApi(new Request("http://site.test/api/v1/relatorio.pdf"));
    const enviados = fetchFalso.mock.calls[0]![1].headers as Headers;
    expect(enviados.has("x-forwarded-for")).toBe(false);
  });

  it("sem x-forwarded-for, usa o x-real-ip para o limite por IP não cair no IP do container", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    await proxyParaApi(new Request("http://site.test/api/v1/ranking", { headers: { "x-real-ip": "203.0.113.7" } }));
    const enviados = fetchFalso.mock.calls[0]![1].headers as Headers;
    expect(enviados.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("ipDoCliente pega o último valor não vazio", () => {
    expect(ipDoCliente("1.1.1.1, 2.2.2.2")).toBe("2.2.2.2");
    expect(ipDoCliente(" 2.2.2.2 ,")).toBe("2.2.2.2");
    expect(ipDoCliente("")).toBeNull();
    expect(ipDoCliente(null)).toBeNull();
  });

  it("só encaminha /api/v1/ e nunca expõe schema, docs ou admin do Django", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    for (const caminho of ["/api/schema/", "/api/docs/", "/api/", "/api/v1x/saude", "/api/../admin/", "/media/qualquer.png"]) {
      const res = await proxyParaApi(new Request(`http://site.test${caminho}`));
      expect(res.status, caminho).toBe(404);
    }
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("encaminha /api/v1/ ao Django com a query string", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchFalso);
    const res = await proxyParaApi(new Request("http://site.test/api/v1/ranking?produto=soja"));
    expect(res.status).toBe(200);
    expect(String(fetchFalso.mock.calls[0]![0])).toMatch(/\/api\/v1\/ranking\?produto=soja$/);
  });

  it("POST repassa corpo e content-type ao Django", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    const corpo = JSON.stringify({ pergunta: "onde fica o ranking?", historico: [], pagina: "/" });
    await proxyParaApi(
      new Request("http://site.test/api/v1/zetele/perguntar", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
        body: corpo,
      }),
    );
    const [url, init] = fetchFalso.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/v1\/zetele\/perguntar$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(corpo);
    expect((init.headers as Headers).get("content-type")).toBe("application/json");
    expect((init.headers as Headers).get("x-forwarded-for")).toBe("203.0.113.9");
  });

  it("GET continua sem corpo", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    await proxyParaApi(new Request("http://site.test/api/v1/ranking"));
    expect(fetchFalso.mock.calls[0]![1].body).toBeUndefined();
  });

  it("recusa corpo acima de 16 KB sem chamar o Django", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const res = await proxyParaApi(
      new Request("http://site.test/api/v1/zetele/perguntar", { method: "POST", body: "x".repeat(16_385) }),
    );
    expect(res.status).toBe(413);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
