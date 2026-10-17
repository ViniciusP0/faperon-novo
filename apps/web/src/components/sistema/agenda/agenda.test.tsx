import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gravar, gravarSessao } from "@/lib/sistema/armazenamento";
import { hojeISO } from "@/lib/sistema/datas";
import { SistemaProvider } from "@/lib/sistema/estado";
import { Agenda } from "./agenda";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/sistema/agenda" }));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
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
    expect(screen.queryByText(/Rascunho/)).toBeNull();
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
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("link", { name: /Viagem a Cacoal/ })).toHaveAttribute("href", "/sistema/frotas?aba=reservas");
    const institucional = screen.getAllByText("FAPERON")[0]!;
    expect(institucional.closest("button")).toBeNull();
  });
});
