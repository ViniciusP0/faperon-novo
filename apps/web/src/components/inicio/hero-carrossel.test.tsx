import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroCarrossel } from "./hero-carrossel";

const slides = [
  { id: "a", titulo: "Primeiro", conteudo: <h2>Primeiro</h2> },
  { id: "b", titulo: "Segundo", conteudo: <h2>Segundo</h2> },
  { id: "c", titulo: "Terceiro", conteudo: <h2>Terceiro</h2> },
];

function movimentoReduzido(ativo: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: ativo && q.includes("reduce"),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const grupos = () => screen.getAllByRole("group", { hidden: true }).filter((g) => g.getAttribute("aria-roledescription") === "slide");
const visiveis = () => grupos().filter((g) => g.getAttribute("aria-hidden") !== "true");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  movimentoReduzido(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("HeroCarrossel", () => {
  it("mostra um slide por vez, rotulado 'n de total', e começa no primeiro", () => {
    render(<HeroCarrossel slides={slides} rotulo="Destaques" />);
    expect(screen.getByRole("region", { name: "Destaques" })).toHaveAttribute("aria-roledescription", "carrossel");
    expect(grupos()).toHaveLength(3);
    expect(visiveis().map((g) => g.getAttribute("aria-label"))).toEqual(["1 de 3"]);
  });

  it("avança, volta e vai direto ao slide pelos botões", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroCarrossel slides={slides} rotulo="Destaques" />);
    await user.click(screen.getByRole("button", { name: "Próximo slide" }));
    expect(visiveis()[0]).toHaveAttribute("aria-label", "2 de 3");
    await user.click(screen.getByRole("button", { name: "Slide anterior" }));
    await user.click(screen.getByRole("button", { name: "Slide anterior" }));
    expect(visiveis()[0]).toHaveAttribute("aria-label", "3 de 3"); // volta dando a volta
    await user.click(screen.getByRole("button", { name: /Ir para o slide 2: Segundo/ }));
    expect(visiveis()[0]).toHaveAttribute("aria-label", "2 de 3");
    expect(screen.getByRole("button", { name: /Ir para o slide 2/ })).toHaveAttribute("aria-current", "true");
  });

  it("avança sozinho a cada 6 segundos e a pausa interrompe a rotação", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroCarrossel slides={slides} rotulo="Destaques" />);
    act(() => void vi.advanceTimersByTime(6100));
    expect(visiveis()[0]).toHaveAttribute("aria-label", "2 de 3");

    await user.click(screen.getByRole("button", { name: "Pausar rotação automática" }));
    act(() => void vi.advanceTimersByTime(30000));
    expect(visiveis()[0]).toHaveAttribute("aria-label", "2 de 3");
    expect(screen.getByRole("button", { name: "Retomar rotação automática" })).toBeInTheDocument();
  });

  it("não gira sozinho para quem prefere menos movimento", () => {
    movimentoReduzido(true);
    render(<HeroCarrossel slides={slides} rotulo="Destaques" />);
    act(() => void vi.advanceTimersByTime(60000));
    expect(visiveis()[0]).toHaveAttribute("aria-label", "1 de 3");
    expect(screen.getByRole("button", { name: "Retomar rotação automática" })).toBeInTheDocument();
  });

  it("pausa enquanto o teclado está dentro do carrossel", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroCarrossel slides={slides} rotulo="Destaques" />);
    await user.tab();
    act(() => void vi.advanceTimersByTime(30000));
    expect(visiveis()[0]).toHaveAttribute("aria-label", "1 de 3");
  });
});
