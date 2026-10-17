import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Personagem } from "./personagem";
import { CHAVE_SAUDACAO, SaudacaoZetele } from "./saudacao-zetele";

const balao = () => screen.queryByRole("button", { name: "Oi! Posso ajudar?" });

beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SaudacaoZetele", () => {
  it("aparece já na montagem e não some sozinha", () => {
    vi.useFakeTimers();
    render(<SaudacaoZetele bloqueada={false} onAbrir={() => {}} />);
    expect(balao()).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(balao()).toBeInTheDocument();
  });

  it("o X dispensa e o balão não volta na mesma visita", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SaudacaoZetele bloqueada={false} onAbrir={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Fechar saudação" }));
    expect(balao()).toBeNull();
    expect(window.sessionStorage.getItem(CHAVE_SAUDACAO)).toBe("1");
    unmount();
    render(<SaudacaoZetele bloqueada={false} onAbrir={() => {}} />);
    expect(balao()).toBeNull();
  });

  it("clicar no balão abre o Zétele e dispensa o balão", async () => {
    const user = userEvent.setup();
    const onAbrir = vi.fn();
    render(<SaudacaoZetele bloqueada={false} onAbrir={onAbrir} />);
    await user.click(balao()!);
    expect(onAbrir).toHaveBeenCalledOnce();
    expect(balao()).toBeNull();
    expect(window.sessionStorage.getItem(CHAVE_SAUDACAO)).toBe("1");
  });

  it("com o sessionStorage bloqueado, aparece e o X ainda fecha", async () => {
    const erro = () => {
      throw new Error("bloqueado");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(erro);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(erro);
    const user = userEvent.setup();
    render(<SaudacaoZetele bloqueada={false} onAbrir={() => {}} />);
    expect(balao()).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fechar saudação" }));
    expect(balao()).toBeNull();
  });

  it("não aparece com o painel aberto", () => {
    render(<SaudacaoZetele bloqueada onAbrir={() => {}} />);
    expect(balao()).toBeNull();
  });
});

describe("Personagem", () => {
  it("marca só a pose ativa e é decorativo", () => {
    const { container } = render(<Personagem pose="tablet" />);
    const ativas = container.querySelectorAll('[data-ativa="true"]');
    expect(ativas).toHaveLength(1);
    expect(ativas[0]!.getAttribute("data-pose")).toBe("tablet");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
