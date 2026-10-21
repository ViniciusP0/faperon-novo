import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoletimDia, BoletimDiasResposta, BoletimNota } from "@/lib/api-types";
import { gravarAcesso, gravarSessao } from "@/lib/sistema/armazenamento";
import { SistemaProvider } from "@/lib/sistema/estado";
import { Boletim } from "./boletim";

const apiFalsa = vi.hoisted(() => ({ boletimDias: vi.fn(), boletimDia: vi.fn() }));
vi.mock("@/lib/api", async (importar) => ({ ...(await importar<typeof import("@/lib/api")>()), api: apiFalsa }));

const nota = (id: number, parcial: Partial<BoletimNota> = {}): BoletimNota => ({
  id,
  origem: "uniao",
  diario: "DOU nº 198",
  orgao: "Incra",
  titulo: `Título da nota ${id}`,
  resumo: `Resumo da nota ${id}.`,
  rondonia: false,
  data: "2026-10-20",
  url: `https://www.in.gov.br/web/dou/-/nota-${id}`,
  ...parcial,
});

const fontesOk = { dou: { status: "ok", erro: "" }, doe: { status: "ok", erro: "" } } as const;

const dias: BoletimDiasResposta = {
  dias: [
    { dia: "2026-10-20", total: 12, tem_destaque: true, fontes: { dou: "ok", doe: "ok" } },
    { dia: "2026-10-19", total: 2, tem_destaque: true, fontes: { dou: "ok", doe: "ok" } },
    { dia: "2026-10-18", total: 0, tem_destaque: false, fontes: { dou: "sem_coleta", doe: "sem_coleta" } },
  ],
};

const diaCheio: BoletimDia = {
  dia: "2026-10-20",
  destaque: nota(1, { rondonia: true, titulo: "Incra retifica o assentamento Jandaíra" }),
  notas: [nota(2), nota(3, { origem: "estado", diario: "DOE-RO nº 201", orgao: "Sepat" })],
  total: 12,
  fontes: fontesOk,
};

function renderBoletim(quem = "marcos") {
  gravarSessao(quem);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SistemaProvider>
        <Boletim />
      </SistemaProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  gravarAcesso(true);
  apiFalsa.boletimDias.mockReset().mockResolvedValue(dias);
  apiFalsa.boletimDia.mockReset().mockResolvedValue(diaCheio);
});

describe("Boletim", () => {
  it("mostra_destaque_e_notas_com_links", async () => {
    renderBoletim();
    const destaque = await screen.findByRole("article", { name: /Incra retifica o assentamento Jandaíra/ });
    expect(within(destaque).getByText("Rondônia")).toBeInTheDocument();
    const original = within(destaque).getByRole("link", { name: /Ver nota original/ });
    expect(original).toHaveAttribute("href", "https://www.in.gov.br/web/dou/-/nota-1");
    expect(original).toHaveAttribute("target", "_blank");
    expect(original).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(original).getByText(/abre em nova aba/)).toHaveClass("sr-only");

    const lista = screen.getByRole("list", { name: "Notas do dia" });
    const itens = within(lista).getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(within(itens[1]!).getByText("Estado · DOE-RO nº 201")).toBeInTheDocument();
    const link = within(itens[0]!).getByRole("link", { name: /Ver nota/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(apiFalsa.boletimDia).toHaveBeenCalledWith("2026-10-20", "todas", false);
  });

  it("troca_de_dia_busca_o_dia", async () => {
    const user = userEvent.setup();
    renderBoletim();
    await screen.findByRole("article");
    apiFalsa.boletimDia.mockResolvedValue({ ...diaCheio, dia: "2026-10-19", destaque: nota(9, { titulo: "Nota de ontem" }), notas: [], total: 1 });
    await user.click(within(screen.getByRole("group", { name: "Dia" })).getByRole("button", { name: /19\/10 · seg/ }));
    expect(await screen.findByRole("article", { name: /Nota de ontem/ })).toBeInTheDocument();
    expect(apiFalsa.boletimDia).toHaveBeenLastCalledWith("2026-10-19", "todas", false);
  });

  it("filtro_de_origem_chama_a_api_com_a_origem", async () => {
    const user = userEvent.setup();
    renderBoletim();
    await screen.findByRole("article");
    await user.click(within(screen.getByRole("group", { name: "Origem" })).getByRole("button", { name: "União · DOU" }));
    await screen.findByRole("article");
    expect(apiFalsa.boletimDia).toHaveBeenLastCalledWith("2026-10-20", "uniao", false);
  });

  it("ver_todas_pede_todas", async () => {
    const user = userEvent.setup();
    renderBoletim();
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "Ver todas as 12 notas" }));
    await screen.findByRole("article");
    expect(apiFalsa.boletimDia).toHaveBeenLastCalledWith("2026-10-20", "todas", true);
    expect(screen.queryByRole("button", { name: /Ver todas/ })).toBeNull();
  });

  it("dia_sem_notas_mostra_mensagem", async () => {
    apiFalsa.boletimDia.mockResolvedValue({ dia: "2026-10-20", destaque: null, notas: [], total: 0, fontes: fontesOk });
    renderBoletim();
    expect(await screen.findByText("Sem notas relevantes hoje")).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("dia_sem_notas_fica_cinza_na_lista_de_dias", async () => {
    renderBoletim();
    await screen.findByRole("article");
    expect(within(screen.getByRole("group", { name: "Dia" })).getByRole("button", { name: /18\/10 · dom.*sem notas/ })).toBeInTheDocument();
  });

  it("fonte_com_falha_mostra_aviso", async () => {
    apiFalsa.boletimDia.mockResolvedValue({
      ...diaCheio,
      fontes: { dou: { status: "ok", erro: "" }, doe: { status: "falha", erro: "Não foi possível ler o diário neste dia." } },
    });
    renderBoletim();
    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("DOE-RO");
    expect(aviso).toHaveTextContent("Não foi possível ler o diário neste dia.");
  });

  it("perfil_sem_permissao_nao_chama_a_api", async () => {
    renderBoletim("carla");
    expect(await screen.findByText("O Boletim do Agro é restrito à coordenação e à gestão.")).toBeInTheDocument();
    expect(apiFalsa.boletimDias).not.toHaveBeenCalled();
    expect(apiFalsa.boletimDia).not.toHaveBeenCalled();
  });

  it("erro_da_api_mostra_alerta", async () => {
    const user = userEvent.setup();
    apiFalsa.boletimDia.mockRejectedValueOnce(new Error("falhou"));
    renderBoletim();
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar o boletim.");
    await user.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });

  it("explica_que_o_resumo_e_de_ia_sem_revisao", async () => {
    renderBoletim();
    await screen.findByRole("article");
    expect(screen.getByText(/sem revisão humana/)).toBeInTheDocument();
    expect(screen.getByText(/até 7 dias/)).toBeInTheDocument();
  });
});
