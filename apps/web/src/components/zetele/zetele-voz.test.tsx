import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGravador } from "./voz";
import { Zetele } from "./zetele";

let caminho = "/sistema/agenda";
vi.mock("next/navigation", () => ({ usePathname: () => caminho }));

const RESPOSTA = { status: "respondida", texto: "Abra a **Agenda** e clique em Novo evento.", fontes: [], sugestoes: [] };
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
const AVISO = "Protótipo: o áudio é processado pela Groq e pelo Google (plano gratuito).";

class GravadorFalso {
  static isTypeSupported = (t: string) => t === "audio/webm;codecs=opus";
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_fluxo: unknown, opcoes?: { mimeType?: string }) {
    this.mimeType = opcoes?.mimeType ?? "";
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["som"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

let pararTrilha: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;
let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;

function stubFetch(opcoes: { voz?: unknown; ouvir?: () => Response; falar?: () => Response } = {}) {
  const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    const u = String(url);
    if (u.endsWith("/estado")) return json({ disponivel: true, motivo: null, voz: opcoes.voz ?? { ouvir: true, falar: true } });
    if (u.endsWith("/ouvir")) return opcoes.ouvir ? opcoes.ouvir() : json({ texto: "Como crio um evento?" });
    if (u.endsWith("/falar")) return opcoes.falar ? opcoes.falar() : new Response(new Uint8Array([82, 73, 70, 70]), { headers: { "content-type": "audio/wav" } });
    return json(RESPOSTA);
  });
  vi.stubGlobal("fetch", f);
  return f;
}
const chamadas = (f: ReturnType<typeof stubFetch>, fim: string) => f.mock.calls.filter(([u]) => String(u).endsWith(fim));

async function abrir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Falar com o Zétele, assistente do site" }));
  return screen.getByRole("dialog", { name: "Zétele" });
}

beforeEach(() => {
  caminho = "/sistema/agenda";
  window.sessionStorage.setItem("zetele-saudou", "1");
  window.localStorage.removeItem("zetele-responder-em-voz");
  vi.stubGlobal("MediaRecorder", GravadorFalso);
  pararTrilha = vi.fn();
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: pararTrilha }] });
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => "blob:resposta");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  // desmonta antes de devolver o play/pause de verdade (o jsdom não implementa)
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Zétele do sistema com voz", () => {
  it("grava, transcreve no campo para conferir, envia e lê a resposta em voz alta", async () => {
    const f = stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Gravar pergunta" }));
    expect(await screen.findByText(/Gravando…/)).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    await user.click(screen.getByRole("button", { name: "Parar gravação" }));

    await waitFor(() => expect(screen.getByLabelText("Sua pergunta")).toHaveValue("Como crio um evento?"));
    expect(pararTrilha).toHaveBeenCalled();
    const [url, init] = chamadas(f, "/ouvir")[0]!;
    expect(String(url)).toMatch(/\/api\/v1\/sistema\/zetele\/ouvir$/);
    const audio = (init!.body as FormData).get("audio") as File;
    expect(audio.name).toBe("pergunta.webm");
    expect(audio.type).toBe("audio/webm;codecs=opus");
    expect(screen.getByText("Confira o texto e envie a pergunta.")).toBeInTheDocument();
    // nada vai para o modelo antes de a pessoa conferir e enviar
    expect(chamadas(f, "/perguntar")).toHaveLength(0);

    await user.keyboard("{Enter}");
    expect(await screen.findByText(/clique em Novo evento/)).toBeInTheDocument();
    await waitFor(() => expect(play).toHaveBeenCalled());
    expect(JSON.parse(chamadas(f, "/falar")[0]![1]!.body as string)).toEqual({ texto: RESPOSTA.texto });
    expect(await screen.findByRole("button", { name: "Parar áudio" })).toBeInTheDocument();
  });

  it("pergunta digitada não toca sozinha; o botão Ouvir toca, para e não paga de novo", async () => {
    const f = stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.type(screen.getByLabelText("Sua pergunta"), "como crio um evento?{Enter}");
    await screen.findByText(/clique em Novo evento/);
    expect(chamadas(f, "/falar")).toHaveLength(0);
    expect(play).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Ouvir resposta" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    await user.click(await screen.findByRole("button", { name: "Parar áudio" }));
    expect(pause).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Ouvir resposta" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(chamadas(f, "/falar")).toHaveLength(1);
  });

  it("'Responder em voz' fica lembrado e faz a resposta digitada tocar", async () => {
    const f = stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    const interruptor = await screen.findByRole("switch", { name: "Responder em voz" });
    expect(interruptor).not.toBeChecked();
    await user.click(interruptor);
    expect(window.localStorage.getItem("zetele-responder-em-voz")).toBe("1");
    await user.type(screen.getByLabelText("Sua pergunta"), "como crio um evento?{Enter}");
    await waitFor(() => expect(play).toHaveBeenCalled());
    expect(chamadas(f, "/falar")).toHaveLength(1);
  });

  it("Esc durante a gravação cancela sem transcrever e sem fechar o painel", async () => {
    const f = stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.click(await screen.findByRole("button", { name: "Gravar pergunta" }));
    await screen.findByRole("button", { name: "Parar gravação" });
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Zétele" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Gravar pergunta" })).toBeInTheDocument();
    expect(chamadas(f, "/ouvir")).toHaveLength(0);
    expect(pararTrilha).toHaveBeenCalled();
  });

  it("mostra o contador com o limite de 1 minuto", async () => {
    stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.click(await screen.findByRole("button", { name: "Gravar pergunta" }));
    expect(await screen.findByText("0:00 / 1:00")).toBeInTheDocument();
    expect(await screen.findByText("0:01 / 1:00", undefined, { timeout: 2500 })).toBeInTheDocument();
  });

  it("o gravador para sozinho no limite e entrega o áudio", async () => {
    const pronto = vi.fn();
    const { result } = renderHook(() => useGravador({ onPronto: pronto, onErro: vi.fn(), limite: 1 }));
    await act(() => result.current.iniciar());
    expect(result.current.estado).toBe("gravando");
    await waitFor(() => expect(pronto).toHaveBeenCalledTimes(1), { timeout: 2500 });
    expect(result.current.estado).toBe("parado");
    expect(pararTrilha).toHaveBeenCalled();
  });

  it("microfone bloqueado vira aviso simples", async () => {
    stubFetch();
    getUserMedia.mockRejectedValue(new DOMException("negado", "NotAllowedError"));
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.click(await screen.findByRole("button", { name: "Gravar pergunta" }));
    expect(await screen.findByText("O microfone está bloqueado. Libere o acesso no navegador para gravar.")).toBeInTheDocument();
  });

  it("áudio sem fala e limite do dia viram avisos simples", async () => {
    stubFetch({ ouvir: () => json({ erro: "x" }, 422), falar: () => json({ erro: "x", motivo: "orcamento_diario" }, 503) });
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.click(await screen.findByRole("button", { name: "Gravar pergunta" }));
    await user.click(await screen.findByRole("button", { name: "Parar gravação" }));
    expect(await screen.findByText("Não entendi o áudio. Tente de novo ou digite a pergunta.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Sua pergunta"), "oi{Enter}");
    await user.click(await screen.findByRole("button", { name: "Ouvir resposta" }));
    expect(await screen.findByText("O Zétele atingiu o limite de hoje.")).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
  });

  it("sem fornecedor de voz: sem microfone, sem Ouvir e sem aviso", async () => {
    stubFetch({ voz: { ouvir: false, falar: false } });
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.type(screen.getByLabelText("Sua pergunta"), "oi{Enter}");
    await screen.findByText(/clique em Novo evento/);
    expect(screen.queryByRole("button", { name: "Gravar pergunta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ouvir resposta" })).toBeNull();
    expect(screen.queryByText(AVISO)).toBeNull();
  });

  it("só ouvir: microfone sem botão Ouvir; sem MediaRecorder: Ouvir sem microfone", async () => {
    stubFetch({ voz: { ouvir: true, falar: false } });
    const user = userEvent.setup();
    const { unmount } = render(<Zetele />);
    await abrir(user);
    expect(await screen.findByRole("button", { name: "Gravar pergunta" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Responder em voz" })).toBeNull();
    unmount();

    vi.stubGlobal("MediaRecorder", undefined);
    stubFetch();
    render(<Zetele />);
    await abrir(user);
    await user.type(screen.getByLabelText("Sua pergunta"), "oi{Enter}");
    expect(await screen.findByRole("button", { name: "Ouvir resposta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gravar pergunta" })).toBeNull();
  });

  it("no site público não há voz, mesmo que o estado diga que sim", async () => {
    caminho = "/painel";
    stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.type(screen.getByLabelText("Sua pergunta"), "oi{Enter}");
    await screen.findByText(/clique em Novo evento/);
    expect(screen.queryByRole("button", { name: "Gravar pergunta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ouvir resposta" })).toBeNull();
    expect(screen.queryByText(AVISO)).toBeNull();
  });
});
