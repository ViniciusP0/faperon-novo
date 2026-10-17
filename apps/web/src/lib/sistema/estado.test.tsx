import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { frotaDeExemplo, pedidosDeExemplo } from "@/content/sistema/exemplo";
import { gravarSessao } from "./armazenamento";
import { SistemaProvider, useSistema } from "./estado";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

function Sonda() {
  const s = useSistema();
  if (!s.pronto) return <p>carregando</p>;
  return (
    <div>
      <p data-testid="quem">{s.funcionario?.nome ?? "ninguém"}</p>
      <p data-testid="eventos">{s.eventos.map((e) => e.titulo).join("|")}</p>
      <p data-testid="veiculos">{s.frota.veiculos.length}</p>
      <button
        onClick={() =>
          s.salvarEvento({ id: "novo", titulo: "Meu evento", data: s.hoje, inicio: "10:00", fim: "11:00", local: "", descricao: "", tipo: "reuniao", origem: "pessoal" })
        }
      >
        criar
      </button>
      <button onClick={s.restaurar}>restaurar</button>
    </div>
  );
}

describe("estado do protótipo", () => {
  it("sem sessão, ninguém está logado mas a frota de exemplo carrega", () => {
    render(<SistemaProvider><Sonda /></SistemaProvider>);
    expect(screen.getByTestId("quem")).toHaveTextContent("ninguém");
    expect(screen.getByTestId("veiculos")).toHaveTextContent("6");
  });

  it("a agenda é por funcionário e persiste no navegador", () => {
    gravarSessao("carla");
    const { unmount } = render(<SistemaProvider><Sonda /></SistemaProvider>);
    act(() => screen.getByText("criar").click());
    expect(screen.getByTestId("eventos")).toHaveTextContent("Meu evento");
    unmount();

    gravarSessao("marcos");
    const outro = render(<SistemaProvider><Sonda /></SistemaProvider>);
    expect(screen.getByTestId("quem")).toHaveTextContent("Marcos Oliveira");
    expect(screen.getByTestId("eventos")).not.toHaveTextContent("Meu evento");
    outro.unmount();

    gravarSessao("carla");
    render(<SistemaProvider><Sonda /></SistemaProvider>);
    expect(screen.getByTestId("eventos")).toHaveTextContent("Meu evento");
  });

  it("restaurar volta aos dados de exemplo", () => {
    gravarSessao("carla");
    render(<SistemaProvider><Sonda /></SistemaProvider>);
    act(() => screen.getByText("criar").click());
    act(() => screen.getByText("restaurar").click());
    expect(screen.getByTestId("eventos")).not.toHaveTextContent("Meu evento");
    expect(screen.getByTestId("quem")).toHaveTextContent("Carla Mendes");
  });
});

describe("dados de exemplo", () => {
  it("são deterministas para o mesmo dia", () => {
    expect(frotaDeExemplo("2026-10-17")).toEqual(frotaDeExemplo("2026-10-17"));
    expect(pedidosDeExemplo("2026-10-17")).toEqual(pedidosDeExemplo("2026-10-17"));
  });

  it("km das viagens concluídas é coerente (final maior que inicial)", () => {
    for (const r of frotaDeExemplo("2026-10-17").reservas.filter((r) => r.situacao === "concluida")) {
      expect(r.kmFinal!).toBeGreaterThan(r.kmInicial!);
    }
  });
});
