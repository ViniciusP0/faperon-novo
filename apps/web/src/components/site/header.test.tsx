import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gravarAcesso, gravarSessao, lerAcesso, lerSessao } from "@/lib/sistema/armazenamento";
import { SiteHeader } from "./header";

let caminho = "/";
const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => caminho, useRouter: () => ({ push }) }));

beforeEach(() => {
  caminho = "/";
  push.mockClear();
});

describe("SiteHeader", () => {
  it("mostra o botão 'Acessar o sistema' levando para /login", () => {
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: /Acessar o sistema/ });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("o menu móvel também tem o botão 'Acessar o sistema'", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const links = screen.getAllByRole("link", { name: /Acessar o sistema/ });
    expect(links.length).toBe(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/login");
  });

  it("na área logada troca 'Acessar o sistema' por 'Sair', que encerra o acesso e volta ao login", async () => {
    caminho = "/sistema/agenda";
    gravarAcesso(true);
    gravarSessao("carla");
    const user = userEvent.setup();
    render(<SiteHeader />);
    expect(screen.queryByRole("link", { name: /Acessar o sistema/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(lerAcesso()).toBe(false);
    expect(lerSessao()).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
  });
});
