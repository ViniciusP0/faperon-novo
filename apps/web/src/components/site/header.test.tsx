import { render, screen, waitFor, within } from "@testing-library/react";
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
  gravarSessao(null);
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

  it("na área logada o menu é o do sistema; nas páginas públicas, o do site", () => {
    caminho = "/sistema/agenda";
    const { unmount } = render(<SiteHeader />);
    const sistema = screen.getByRole("navigation", { name: "Seções do sistema" });
    expect(sistema).toHaveTextContent("Início do sistema");
    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Central de Inteligência" })).toBeNull();
    unmount();

    caminho = "/noticias";
    render(<SiteHeader />);
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveTextContent("Central de Inteligência");
    expect(screen.queryByRole("link", { name: "Início do sistema" })).toBeNull();
  });

  describe("item Boletim (restrito à coordenação e gestão)", () => {
    const nomesNoMenu = () =>
      within(screen.getByRole("navigation", { name: "Seções do sistema" }))
        .getAllByRole("link")
        .map((l) => l.textContent);

    it("aparece logo depois de Relatórios para Marcos", async () => {
      caminho = "/sistema";
      gravarSessao("marcos");
      render(<SiteHeader />);
      const nomes = await waitFor(() => {
        const n = nomesNoMenu();
        expect(n).toContain("Boletim");
        return n;
      });
      expect(nomes.indexOf("Boletim")).toBe(nomes.indexOf("Relatórios") + 1);
      expect(screen.getByRole("link", { name: "Boletim" })).toHaveAttribute("href", "/sistema/boletim");
    });

    it("não aparece para Carla", async () => {
      caminho = "/sistema";
      gravarSessao("carla");
      render(<SiteHeader />);
      await waitFor(() => expect(nomesNoMenu()).toContain("Relatórios"));
      expect(screen.queryByRole("link", { name: "Boletim" })).toBeNull();
    });

    it("não aparece sem sessão nem no menu público", () => {
      caminho = "/sistema";
      const { unmount } = render(<SiteHeader />);
      expect(screen.queryByRole("link", { name: "Boletim" })).toBeNull();
      unmount();
      caminho = "/noticias";
      gravarSessao("marcos");
      render(<SiteHeader />);
      expect(screen.queryByRole("link", { name: "Boletim" })).toBeNull();
    });

    it("segue a mesma regra no menu móvel", async () => {
      caminho = "/sistema";
      gravarSessao("marcos");
      const user = userEvent.setup();
      const { unmount } = render(<SiteHeader />);
      await user.click(screen.getByRole("button", { name: "Abrir menu" }));
      const movel = screen.getByRole("navigation", { name: "Seções do sistema (móvel)" });
      await waitFor(() => expect(within(movel).getByRole("link", { name: "Boletim" })).toBeInTheDocument());
      unmount();

      gravarSessao("carla");
      render(<SiteHeader />);
      await user.click(screen.getByRole("button", { name: "Abrir menu" }));
      const movel2 = screen.getByRole("navigation", { name: "Seções do sistema (móvel)" });
      await waitFor(() => expect(within(movel2).getByRole("link", { name: "Relatórios" })).toBeInTheDocument());
      expect(within(movel2).queryByRole("link", { name: "Boletim" })).toBeNull();
    });
  });
});
