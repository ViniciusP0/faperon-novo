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
});
