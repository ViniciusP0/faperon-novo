import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Zetele } from "./zetele";

let caminho = "/painel";
vi.mock("next/navigation", () => ({ usePathname: () => caminho }));

const URL_SOJA = "/painel?segmento=agricultura&produto=soja-em-grao&indicador=quantidade-produzida&fim=2024";
const RESPOSTA = {
  status: "respondida",
  texto: "Em 2024, Ariquemes liderou a produção de soja.",
  fontes: [{ rotulo: "IBGE – PAM, tabela 5457, ano 2024", url_fonte: "https://sidra.ibge.gov.br/Tabela/5457", url_interna: URL_SOJA, atualizado_em: null }],
  sugestoes: [],
};
const json = (corpo: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json", ...headers } });

function stubFetch(opcoes: { estado?: unknown; perguntar?: () => Promise<Response> } = {}) {
  const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    if (String(url).endsWith("/zetele/estado")) return json(opcoes.estado ?? { disponivel: true, motivo: null });
    return opcoes.perguntar ? opcoes.perguntar() : json(RESPOSTA);
  });
  vi.stubGlobal("fetch", f);
  return f;
}

const poseAtiva = () => document.querySelector('[data-ativa="true"]')?.getAttribute("data-pose");
const abrir = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Falar com o Zétele, assistente do site" }));

beforeEach(() => {
  caminho = "/painel";
  window.sessionStorage.setItem("zetele-saudou", "1");
});
afterEach(() => vi.unstubAllGlobals());

describe("Zetele", () => {
  it("não aparece fora do Início e da Central", () => {
    caminho = "/sobre";
    stubFetch();
    render(<Zetele />);
    expect(screen.queryByRole("button", { name: /Zétele/ })).toBeNull();
  });

  it("começa fechado; abrir leva o foco ao campo; Esc fecha e devolve o foco", async () => {
    stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await abrir(user);
    const dialogo = screen.getByRole("dialog", { name: "Zétele" });
    expect(dialogo).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Sua pergunta")).toHaveFocus());
    expect(screen.getByLabelText("Sua pergunta")).toHaveAttribute("maxlength", "500");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Falar com o Zétele, assistente do site" })).toHaveFocus();
  });

  it("pergunta estática responde sem chamar a API e aponta o link", async () => {
    const f = stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.click(screen.getByRole("button", { name: "Como gero o relatório em PDF no Painel?" }));
    expect(screen.getByText(/Gerar PDF/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir o Painel Agro Analítico" })).toHaveAttribute("href", "/painel");
    expect(f.mock.calls.filter(([u]) => String(u).endsWith("/perguntar"))).toHaveLength(0);
    expect(poseAtiva()).toBe("apontando");
  });

  it("pergunta de dados faz POST, mostra a resposta com fonte e aponta", async () => {
    const f = stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.click(screen.getByRole("button", { name: "Qual município mais produz soja em Rondônia?" }));
    expect(await screen.findByText(/Ariquemes liderou/)).toBeInTheDocument();
    const chamada = f.mock.calls.find(([u]) => String(u).endsWith("/zetele/perguntar"))!;
    const corpo = JSON.parse(chamada[1]!.body as string);
    expect(corpo).toMatchObject({ pergunta: "Qual município mais produz soja em Rondônia?", pagina: "/painel" });
    expect(screen.getByRole("link", { name: "Ver no site" })).toHaveAttribute("href", URL_SOJA);
    expect(poseAtiva()).toBe("apontando");
  });

  it("mostra o tablet e o aviso enquanto consulta", async () => {
    stubFetch({ perguntar: () => new Promise<Response>(() => {}) });
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.type(screen.getByLabelText("Sua pergunta"), "onde fica o ranking?{Enter}");
    expect(await screen.findByText("Zétele está consultando os dados…")).toBeInTheDocument();
    expect(poseAtiva()).toBe("tablet");
  });

  it("no Início só aparecem perguntas de orientação, nem em 'mais sugestões'", async () => {
    caminho = "/";
    stubFetch();
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    expect(screen.getByRole("button", { name: "O que é a Central de Inteligência?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Qual município mais produz soja em Rondônia?" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mais sugestões" })).toBeNull();
  });

  it("sem o modelo: campo desabilitado e só perguntas estáticas", async () => {
    stubFetch({ estado: { disponivel: false, motivo: "sem_chave" } });
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await waitFor(() => expect(screen.getByLabelText("Sua pergunta")).toBeDisabled());
    expect(screen.getByText("Hoje só respondo às perguntas prontas.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Qual município mais produz soja em Rondônia?" })).toBeNull();
    expect(screen.getByRole("button", { name: "Como gero o relatório em PDF no Painel?" })).toBeInTheDocument();
  });

  it("429 avisa quanto esperar", async () => {
    stubFetch({ perguntar: async () => json({ erro: "x", campos: {} }, 429, { "retry-after": "12" }) });
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.type(screen.getByLabelText("Sua pergunta"), "oi{Enter}");
    expect(await screen.findAllByText("Muitas perguntas de uma vez; espere 12 segundos.")).not.toHaveLength(0);
  });

  it("falha de rede oferece tentar de novo com a mesma pergunta", async () => {
    let tentativa = 0;
    stubFetch({ perguntar: async () => (tentativa++ === 0 ? Promise.reject(new Error("rede")) : json(RESPOSTA)) });
    const user = userEvent.setup();
    render(<Zetele />);
    await abrir(user);
    await user.type(screen.getByLabelText("Sua pergunta"), "soja?{Enter}");
    await user.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText(/Ariquemes liderou/)).toBeInTheDocument();
  });
});
