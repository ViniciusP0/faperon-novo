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
    expect(await res.json()).toEqual({ erro: "Corpo grande demais" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("aceita corpo de exatamente 16 KB", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    const corpo = "x".repeat(16_384);
    const res = await proxyParaApi(new Request("http://site.test/api/v1/zetele/perguntar", { method: "POST", body: corpo }));
    expect(res.status).toBe(200);
    expect(fetchFalso.mock.calls[0]![1].body).toBe(corpo);
  });

  it("conta bytes, não caracteres", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    // 9 000 caracteres, 18 000 bytes em UTF-8.
    const res = await proxyParaApi(
      new Request("http://site.test/api/v1/zetele/perguntar", { method: "POST", body: "é".repeat(9_000) }),
    );
    expect(res.status).toBe(413);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("corta um stream sem content-length assim que passa de 16 KB, sem ler o resto", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    let pedacos = 0;
    // 1 MB em pedaços de 4 KB: ler tudo antes de checar puxaria os 256 pedaços. Finito de propósito, para um
    // proxy que bufferiza falhar no assert em vez de travar o teste enchendo a memória.
    const fluxo = new ReadableStream<Uint8Array>({
      pull(controle) {
        pedacos++;
        controle.enqueue(new Uint8Array(4_096));
        if (pedacos === 256) controle.close();
      },
    });
    const res = await proxyParaApi(
      new Request("http://site.test/api/v1/zetele/perguntar", { method: "POST", body: fluxo, duplex: "half" } as RequestInit),
    );
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ erro: "Corpo grande demais" });
    expect(pedacos).toBeLessThan(10);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("content-length declarado acima do limite: 413 sem ler o corpo", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const req = new Request("http://site.test/api/v1/zetele/perguntar", {
      method: "POST",
      headers: { "content-length": "500000000" },
      body: "x",
    });
    const res = await proxyParaApi(req);
    expect(res.status).toBe(413);
    expect(req.bodyUsed).toBe(false);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("corpo que falha no meio da leitura vira 400", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const fluxo = new ReadableStream<Uint8Array>({
      pull(controle) {
        controle.error(new Error("cliente desconectou"));
      },
    });
    const res = await proxyParaApi(
      new Request("http://site.test/api/v1/zetele/perguntar", { method: "POST", body: fluxo, duplex: "half" } as RequestInit),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ erro: "Corpo inválido" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
