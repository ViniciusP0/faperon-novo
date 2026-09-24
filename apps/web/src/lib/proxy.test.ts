import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyParaApi } from "./proxy";

afterEach(() => vi.unstubAllGlobals());

describe("proxyParaApi", () => {
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
