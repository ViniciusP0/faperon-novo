import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gravar, gravarAcesso, gravarSessao } from "@/lib/sistema/armazenamento";
import { hojeISO } from "@/lib/sistema/datas";
import { SistemaProvider } from "@/lib/sistema/estado";
import { Agenda } from "./agenda";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/sistema/agenda" }));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  gravarAcesso(true);
});

function renderAgenda(quem: string) {
  gravarSessao(quem);
  return render(
    <SistemaProvider>
      <Agenda />
    </SistemaProvider>,
  );
}

async function criarEvento(user: ReturnType<typeof userEvent.setup>, titulo: string) {
  await user.click(screen.getByRole("button", { name: "Novo evento" }));
  const dialogo = screen.getByRole("dialog", { name: "Novo evento" });
  expect(within(dialogo).getByLabelText("Título")).toHaveFocus();
  await user.type(within(dialogo).getByLabelText("Título"), titulo);
  await user.click(within(dialogo).getByRole("button", { name: "Salvar" }));
}

describe("Agenda individual", () => {
  it("cria um evento que aparece no mês e na lista", async () => {
    const user = userEvent.setup();
    renderAgenda("carla");
    await criarEvento(user, "Entrevista com a rádio");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Editar Entrevista com a rádio/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByText(/Entrevista com a rádio/)).toBeInTheDocument();
  });

  it("valida título e horário", async () => {
    const user = userEvent.setup();
    renderAgenda("carla");
    await user.click(screen.getByRole("button", { name: "Novo evento" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Informe o título do evento.");
    await user.type(screen.getByLabelText("Título"), "X");
    await user.clear(screen.getByLabelText("Fim"));
    await user.type(screen.getByLabelText("Fim"), "08:00");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O fim precisa ser depois do início.");
  });

  it("outro funcionário não vê o evento", async () => {
    const user = userEvent.setup();
    const { unmount } = renderAgenda("carla");
    await criarEvento(user, "Só da Carla");
    unmount();
    renderAgenda("joao");
    expect(screen.queryByText(/Só da Carla/)).toBeNull();
  });

  it("edita e exclui o próprio evento", async () => {
    const user = userEvent.setup();
    renderAgenda("ana");
    await criarEvento(user, "Rascunho");
    await user.click(screen.getByRole("button", { name: /Editar Rascunho/ }));
    await user.click(screen.getByRole("button", { name: "Excluir evento" }));
    expect(screen.queryByRole("button", { name: /Editar Rascunho/ })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Evento “Rascunho” excluído.");
  });

  it("Desfazer devolve o evento excluído", async () => {
    const user = userEvent.setup();
    renderAgenda("ana");
    await criarEvento(user, "Visita ao sindicato");
    await user.click(screen.getByRole("button", { name: /Editar Visita ao sindicato/ }));
    await user.click(screen.getByRole("button", { name: "Excluir evento" }));
    await user.click(within(screen.getByRole("status")).getByRole("button", { name: "Desfazer" }));
    expect(screen.getByRole("button", { name: /Editar Visita ao sindicato/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("restaurado");
  });

  it("ao salvar, avisa a data e leva ao mês do evento", async () => {
    const user = userEvent.setup();
    renderAgenda("carla");
    await user.click(screen.getByRole("button", { name: "Novo evento" }));
    const dialogo = screen.getByRole("dialog", { name: "Novo evento" });
    await user.type(within(dialogo).getByLabelText("Título"), "Feira de Ji-Paraná");
    const data = within(dialogo).getByLabelText("Data");
    await user.clear(data);
    await user.type(data, "2031-03-14");
    await user.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Marcado para .*14 de março.*às 09:00/);
    expect(screen.getByRole("heading", { level: 2, name: /Março 2031/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Editar Feira de Ji-Paraná/ })).toBeInTheDocument();
  });

  it("viagem de vários dias aparece em todos os dias, para quem viaja e para os colegas", async () => {
    const hoje = hojeISO();
    const depois = (n: number) => {
      const d = new Date(`${hoje}T12:00`);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    gravar("frota", {
      veiculos: [{ id: "v1", placa: "ABC1D23", modelo: "Hilux", ano: 2022, km: 1000 }],
      reservas: [{ id: "r9", veiculoId: "v1", funcionarioId: "joao", saida: `${hoje}T07:00`, retorno: `${depois(2)}T18:00`, destino: "Vilhena", motivo: "x", kmInicial: null, kmFinal: null, situacao: "agendada" }],
      abastecimentos: [],
      manutencoes: [],
    });
    const user = userEvent.setup();
    const { unmount } = renderAgenda("joao");
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getAllByRole("link", { name: /Viagem a Vilhena/ })).toHaveLength(3);
    expect(screen.getByText("dia todo")).toBeInTheDocument();
    expect(screen.getByText("volta 18:00")).toBeInTheDocument();
    unmount();
    renderAgenda("carla");
    await user.click(screen.getByRole("button", { name: "Lista" }));
    // a colega vê os três dias, sem link para a reserva do João
    expect(screen.getAllByText(/João Pereira em viagem a Vilhena/)).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /Vilhena/ })).toBeNull();
  });

  it("eventos da FAPERON aparecem para todos, sem edição; a reserva de veículo aparece como viagem", async () => {
    const hoje = hojeISO();
    gravar("frota", {
      veiculos: [{ id: "v1", placa: "ABC1D23", modelo: "Hilux", ano: 2022, km: 1000 }],
      reservas: [{ id: "r1", veiculoId: "v1", funcionarioId: "luiza", saida: `${hoje}T08:00`, retorno: `${hoje}T12:00`, destino: "Cacoal", motivo: "x", kmInicial: null, kmFinal: null, situacao: "agendada" }],
      abastecimentos: [],
      manutencoes: [],
    });
    const user = userEvent.setup();
    renderAgenda("luiza");
    // no mês, a viagem vira faixa com o destino
    expect(screen.getByRole("link", { name: /Viagem da frota, Cacoal/ })).toHaveAttribute("href", "/sistema/frotas?aba=reservas");
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("link", { name: /Viagem a Cacoal/ })).toHaveAttribute("href", "/sistema/frotas?aba=reservas");
    const institucional = screen.getAllByText("FAPERON")[0]!;
    expect(institucional.closest("button")).toBeNull();
  });
});
