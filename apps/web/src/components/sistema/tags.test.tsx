import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gravarAcesso, gravarSessao, ler } from "@/lib/sistema/armazenamento";
import { SistemaProvider } from "@/lib/sistema/estado";
import type { Atividade, Evento, RegistroHistorico, Tag } from "@/lib/sistema/tipos";
import { BarraSistema } from "./barra-sistema";
import { TourProvider } from "./tour/tour";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/sistema" }));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  gravarAcesso(true);
});

function renderBarra(quem: string) {
  gravarSessao(quem);
  return render(
    <SistemaProvider>
      <TourProvider>
        <BarraSistema />
      </TourProvider>
    </SistemaProvider>,
  );
}

const nomes = () => ler<Tag[]>("tags", []).map((t) => t.nome);
const acoes = () => ler<RegistroHistorico[]>("historico", []).map((r) => r.acao);

describe("Gerenciar tags", () => {
  it("só aparece para quem gere (coordenador ou gestor)", () => {
    const { unmount } = renderBarra("carla");
    expect(screen.queryByRole("button", { name: "Gerenciar tags" })).toBeNull();
    unmount();
    renderBarra("marcos");
    expect(screen.getByRole("button", { name: "Gerenciar tags" })).toBeInTheDocument();
  });

  it("cria tag, recusa nome vazio ou repetido (sem caixa nem acento) e anota no histórico", async () => {
    const user = userEvent.setup();
    renderBarra("marcos");
    await user.click(screen.getByRole("button", { name: "Gerenciar tags" }));
    const dialogo = screen.getByRole("dialog", { name: "Gerenciar tags" });
    const campo = within(dialogo).getByLabelText("Nova tag");
    expect(campo).toHaveFocus();

    await user.click(within(dialogo).getByRole("button", { name: "Criar tag" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Informe o nome da tag.");
    await user.type(campo, "dia de câmpo");
    await user.click(within(dialogo).getByRole("button", { name: "Criar tag" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Já existe a tag “Dia de campo”.");

    await user.clear(campo);
    await user.type(campo, "Feira regional");
    await user.selectOptions(within(dialogo).getByLabelText("Cor da nova tag"), "magenta");
    await user.click(within(dialogo).getByRole("button", { name: "Criar tag" }));
    expect(within(dialogo).getByLabelText("Nome da tag Feira regional")).toHaveValue("Feira regional");
    expect(ler<Tag[]>("tags", []).find((t) => t.nome === "Feira regional")?.cor).toBe("magenta");
    expect(acoes()).toContain('Criou a tag "Feira regional"');
  });

  it("renomeia e troca a cor", async () => {
    const user = userEvent.setup();
    renderBarra("marcos");
    await user.click(screen.getByRole("button", { name: "Gerenciar tags" }));
    const dialogo = screen.getByRole("dialog", { name: "Gerenciar tags" });
    const nome = within(dialogo).getByLabelText("Nome da tag SENAR");
    await user.clear(nome);
    await user.type(nome, "Sindicatos");
    await user.click(within(dialogo).getByRole("button", { name: "Salvar a tag SENAR" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Já existe a tag “Sindicatos”.");

    await user.clear(nome);
    await user.type(nome, "Cursos SENAR");
    await user.selectOptions(within(dialogo).getByLabelText("Cor da tag SENAR"), "indigo");
    await user.click(within(dialogo).getByRole("button", { name: "Salvar a tag SENAR" }));
    expect(nomes()).toContain("Cursos SENAR");
    expect(nomes()).not.toContain("SENAR");
    expect(acoes()).toContain('Renomeou a tag "SENAR" para "Cursos SENAR" e trocou a cor para índigo');
  });

  it("apagar pede confirmação e tira a tag dos itens", async () => {
    const user = userEvent.setup();
    renderBarra("marcos");
    // os dados de exemplo já trazem a tag Urgente num evento do Marcos e SENAR numa atividade
    expect(ler<Evento[]>("agenda:marcos", []).length).toBe(0);
    await user.click(screen.getByRole("button", { name: "Gerenciar tags" }));
    const dialogo = screen.getByRole("dialog", { name: "Gerenciar tags" });
    await user.click(within(dialogo).getByRole("button", { name: "Apagar a tag Urgente" }));
    const confirmar = within(dialogo).getByRole("group", { name: "Confirmar: apagar a tag Urgente" });
    await user.click(within(confirmar).getByRole("button", { name: "Manter" }));
    expect(within(dialogo).getByLabelText("Nome da tag Urgente")).toBeInTheDocument();

    await user.click(within(dialogo).getByRole("button", { name: "Apagar a tag Urgente" }));
    await user.click(within(dialogo).getByRole("button", { name: "Apagar tag" }));
    expect(nomes()).not.toContain("Urgente");
    expect(within(dialogo).queryByLabelText("Nome da tag Urgente")).toBeNull();
    const agenda = ler<Evento[]>("agenda:marcos", []);
    expect(agenda.find((e) => e.titulo === "Conferir notas de abastecimento")?.tags).toEqual([]);
    expect(acoes()).toContain('Apagou a tag "Urgente"');

    await user.click(within(dialogo).getByRole("button", { name: "Apagar a tag SENAR" }));
    await user.click(within(dialogo).getByRole("button", { name: "Apagar tag" }));
    expect(ler<Atividade[]>("atividades", []).some((a) => a.tags?.includes("tag-senar"))).toBe(false);
  });
});
