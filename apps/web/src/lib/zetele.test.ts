import { afterEach, describe, expect, it, vi } from "vitest";
import { obterEstado, partesDoTexto, perguntar, baseDoZetele, ehRotaInterna, falarTexto, nomeDoAudio, ouvirAudio } from "./zetele";

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

describe("rota interna (auditoria de 18/10/2026)", () => {
  it("recusa o que o navegador leria como outro domínio", () => {
    expect(ehRotaInterna("/painel")).toBe(true);
    expect(ehRotaInterna("/sistema/agenda?aba=lista")).toBe(true);
    for (const ruim of ["//evil.example", "/\\evil.example", "/\\/evil", "/pai nel", "/a\tb", "https://x", "painel"]) expect(ehRotaInterna(ruim), ruim).toBe(false);
  });
});

describe("voz do Zétele do sistema", () => {
  it("nomeDoAudio dá a extensão que o servidor aceita", () => {
    expect(nomeDoAudio("audio/webm;codecs=opus")).toBe("pergunta.webm");
    expect(nomeDoAudio("audio/mp4")).toBe("pergunta.mp4");
    expect(nomeDoAudio("audio/ogg; codecs=opus")).toBe("pergunta.ogg");
    expect(nomeDoAudio("")).toBe("pergunta.webm");
  });

  it("ouvirAudio manda multipart ao /ouvir do sistema e traduz as respostas", async () => {
    const respostas = [json({ texto: "oi" }), json({ erro: "x" }, 422), json({ erro: "x" }, 413), json({ erro: "x" }, 429, { "retry-after": "7" }), json({ erro: "x", motivo: "voz_desligada" }, 503)];
    const f = vi.fn(async () => respostas.shift()!);
    vi.stubGlobal("fetch", f);
    const audio = new Blob(["som"], { type: "audio/webm" });
    expect(await ouvirAudio(audio, "/sistema/agenda")).toEqual({ tipo: "ok", texto: "oi" });
    expect(String((f.mock.calls[0] as unknown[])[0])).toBe("/api/v1/sistema/zetele/ouvir");
    expect(await ouvirAudio(audio, "/sistema")).toEqual({ tipo: "nao_entendi" });
    expect(await ouvirAudio(audio, "/sistema")).toEqual({ tipo: "recusado" });
    expect(await ouvirAudio(audio, "/sistema")).toEqual({ tipo: "espera", segundos: 7 });
    expect(await ouvirAudio(audio, "/sistema")).toEqual({ tipo: "indisponivel", motivo: "voz_desligada" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    expect(await ouvirAudio(audio, "/sistema")).toEqual({ tipo: "falha" });
  });

  it("falarTexto pede o WAV em JSON", async () => {
    const f = vi.fn(async () => new Response(new Uint8Array([82, 73, 70, 70]), { headers: { "content-type": "audio/wav" } }));
    vi.stubGlobal("fetch", f);
    const r = await falarTexto("Olá", "/sistema");
    expect(r.tipo).toBe("ok");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/sistema/zetele/falar");
    expect(JSON.parse(init.body as string)).toEqual({ texto: "Olá" });
  });
});
