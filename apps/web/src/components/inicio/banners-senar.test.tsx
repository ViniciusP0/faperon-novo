import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BannersSenar } from "./banners-senar";

const banners = [
  { id: "a", imagem: "/senar/a.jpg", alt: "Banner institucional do SENAR", largura: 1800, altura: 672 },
  { id: "b", imagem: "/senar/b.jpg", alt: "Processo seletivo e-Tec", largura: 1567, altura: 672 },
  { id: "c", imagem: "/senar/c.jpg", alt: "Credenciamento ATeG", largura: 1568, altura: 672 },
];
const props = { banners, rotulo: "Banners do SENAR", url: "https://sistemafaperon.org.br/" };

const slides = () => screen.getAllByRole("group", { hidden: true }).filter((g) => g.getAttribute("aria-roledescription") === "slide");
const visivel = () => slides().find((g) => g.getAttribute("aria-hidden") !== "true");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BannersSenar", () => {
  it("cada banner é um link externo para o Sistema FAPERON/SENAR com o texto do banner como nome", () => {
    render(<BannersSenar {...props} />);
    const link = screen.getByRole("link", { name: /Banner institucional do SENAR/ });
    expect(link).toHaveAttribute("href", "https://sistemafaperon.org.br/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("region", { name: "Banners do SENAR" })).toHaveAttribute("aria-roledescription", "carrossel");
  });

  it("navega por setas e pontos", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BannersSenar {...props} />);
    expect(visivel()).toHaveAttribute("aria-label", "1 de 3");
    await user.click(screen.getByRole("button", { name: "Próximo banner" }));
    expect(visivel()).toHaveAttribute("aria-label", "2 de 3");
    await user.click(screen.getByRole("button", { name: "Banner anterior" }));
    await user.click(screen.getByRole("button", { name: "Banner anterior" }));
    expect(visivel()).toHaveAttribute("aria-label", "3 de 3");
    await user.click(screen.getByRole("button", { name: /Ir para o banner 2/ }));
    expect(visivel()).toHaveAttribute("aria-label", "2 de 3");
  });

  it("gira sozinho a cada 6 segundos", () => {
    render(<BannersSenar {...props} />);
    act(() => void vi.advanceTimersByTime(6100));
    expect(visivel()).toHaveAttribute("aria-label", "2 de 3");
    act(() => void vi.advanceTimersByTime(6000));
    expect(visivel()).toHaveAttribute("aria-label", "3 de 3");
  });

  it("permite pausar a rotação", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BannersSenar {...props} />);
    await user.click(screen.getByRole("button", { name: "Pausar rotação automática" }));
    act(() => void vi.advanceTimersByTime(30000));
    expect(visivel()).toHaveAttribute("aria-label", "1 de 3");
  });
});
