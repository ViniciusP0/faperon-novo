import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gravarAcesso, gravarSessao } from "@/lib/sistema/armazenamento";
import { SistemaProvider } from "@/lib/sistema/estado";
import { Relatorios } from "./relatorios";

function renderRelatorios(quem: string) {
  gravarSessao(quem);
  return render(
    <SistemaProvider>
      <Relatorios />
    </SistemaProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  gravarAcesso(true);
});
afterEach(() => vi.restoreAllMocks());

describe("Relatórios", () => {
  it("gera o de frota do mês com totais e troca para os outros tipos", async () => {
    const user = userEvent.setup();
    renderRelatorios("carla");
    expect(screen.getByRole("heading", { name: "Uso e custos da frota" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Total" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Espaços" }));
    expect(screen.getByRole("heading", { name: "Ocupação dos espaços" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByRole("heading", { name: "Agenda no período" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Prestação de contas" }));
    expect(screen.getByRole("heading", { name: "Prestação de contas: minhas despesas" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Funcionário" })).toBeNull();
  });

  it("o gestor vê as despesas de todos", async () => {
    const user = userEvent.setup();
    renderRelatorios("marcos");
    await user.click(screen.getByRole("button", { name: "Últimos 3 meses" }));
    await user.click(screen.getByRole("button", { name: "Prestação de contas" }));
    expect(screen.getByRole("columnheader", { name: "Funcionário" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "Carla Mendes" }).length).toBeGreaterThan(0);
  });

  it("período invertido mostra erro em vez do relatório", async () => {
    const user = userEvent.setup();
    renderRelatorios("carla");
    await user.clear(screen.getByLabelText("De"));
    await user.type(screen.getByLabelText("De"), "2099-01-01");
    expect(screen.getByRole("alert")).toHaveTextContent("data inicial não pode vir depois da final");
    expect(screen.queryByRole("button", { name: /Baixar CSV/ })).toBeNull();
  });

  it("baixa o CSV e chama a impressão", async () => {
    const user = userEvent.setup();
    const criar = vi.fn(() => "blob:x");
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    renderRelatorios("carla");
    await user.click(screen.getByRole("button", { name: /Baixar CSV/ }));
    expect(criar).toHaveBeenCalledOnce();
    const blob = (criar.mock.calls[0] as unknown as [Blob])[0];
    const texto = await new Promise<string>((ok) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result));
      leitor.readAsText(blob);
    });
    expect(texto).toMatch(/Veículo;Viagens;Km rodados/);
    expect(clique).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /Imprimir/ }));
    expect(imprimir).toHaveBeenCalledOnce();
  });

  it("capa e contracapa no padrão do boletim, personalizáveis por tipo e salvas para a próxima vez", async () => {
    const user = userEvent.setup();
    const { unmount } = renderRelatorios("carla");
    const capa = screen.getByRole("region", { name: "Capa" });
    expect(within(capa).getByRole("heading", { name: "Relatório de Gestão da Frota" })).toBeInTheDocument();
    expect(capa).toHaveTextContent(/Período de análise: \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/);
    const contracapa = screen.getByRole("region", { name: "Contracapa" });
    expect(contracapa).toHaveTextContent("Carla Mendes - Comunicação");

    await user.click(screen.getByRole("button", { name: "Personalizar capa e contracapa" }));
    const dialogo = screen.getByRole("dialog");
    await user.clear(within(dialogo).getByLabelText("Título"));
    await user.type(within(dialogo).getByLabelText("Título"), "Frota da Regional Sul");
    await user.click(within(dialogo).getByRole("button", { name: "Adicionar campo" }));
    await user.type(within(dialogo).getByLabelText("Rótulo do campo 5"), "Regional");
    await user.type(within(dialogo).getByLabelText("Valor do campo 5"), "Vilhena");
    await user.click(within(dialogo).getByLabelText("Incluir contracapa"));
    await user.click(within(dialogo).getByRole("button", { name: "Salvar modelo" }));

    expect(within(screen.getByRole("region", { name: "Capa" })).getByRole("heading", { name: "Frota da Regional Sul" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Capa" })).toHaveTextContent("Regional: Vilhena");
    expect(screen.queryByRole("region", { name: "Contracapa" })).toBeNull();
    // outro tipo tem o próprio modelo
    await user.click(screen.getByRole("button", { name: "Espaços" }));
    expect(within(screen.getByRole("region", { name: "Capa" })).getByRole("heading", { name: "Relatório de Ocupação dos Espaços" })).toBeInTheDocument();
    unmount();

    renderRelatorios("carla");
    expect(within(screen.getByRole("region", { name: "Capa" })).getByRole("heading", { name: "Frota da Regional Sul" })).toBeInTheDocument();
  });
});
