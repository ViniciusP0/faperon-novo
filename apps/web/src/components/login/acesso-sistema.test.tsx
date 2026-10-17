import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lerAcesso } from "@/lib/sistema/armazenamento";
import { AcessoSistema } from "./acesso-sistema";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("Acessar o sistema (protótipo)", () => {
  it("recusa credenciais erradas e não libera a área", async () => {
    const user = userEvent.setup();
    render(<AcessoSistema />);
    await user.type(await screen.findByLabelText("E-mail"), "user@faperon.br");
    await user.type(screen.getByLabelText("Senha"), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
    expect(lerAcesso()).toBe(false);
    expect(screen.queryByRole("button", { name: /^Entrar como/ })).toBeNull();
  });

  it("com user@faperon.br e Senha@123, libera e mostra os perfis; Sair volta ao login", async () => {
    const user = userEvent.setup();
    render(<AcessoSistema />);
    await user.type(await screen.findByLabelText("E-mail"), "user@faperon.br");
    await user.type(screen.getByLabelText("Senha"), "Senha@123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findAllByRole("button", { name: /^Entrar como/ })).toHaveLength(5);
    expect(lerAcesso()).toBe(true);
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    expect(lerAcesso()).toBe(false);
  });
});
