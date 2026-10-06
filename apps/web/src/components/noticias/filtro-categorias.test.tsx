import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FiltroCategorias } from "./filtro-categorias";

const opcoes = [
  { slug: "faperon", nome: "Faperon", total: 17 },
  { slug: "geral", nome: "Geral", total: 12 },
];

describe("FiltroCategorias", () => {
  it("lista Todas e as categorias com a contagem, como links para a URL filtrada", () => {
    render(<FiltroCategorias opcoes={opcoes} ativa={null} total={20} />);
    const nav = screen.getByRole("navigation", { name: "Filtrar por categoria" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Todas/ })).toHaveAttribute("href", "/noticias");
    expect(screen.getByRole("link", { name: /Faperon/ })).toHaveAttribute("href", "/noticias?categoria=faperon");
    expect(screen.getByRole("link", { name: /Geral/ })).toHaveAttribute("href", "/noticias?categoria=geral");
    expect(screen.getByRole("link", { name: "Faperon (17)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todas (20)" })).toBeInTheDocument();
  });

  it("marca só o item ativo com aria-current", () => {
    render(<FiltroCategorias opcoes={opcoes} ativa="geral" total={20} />);
    expect(screen.getByRole("link", { name: /Geral/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Todas/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /Faperon/ })).not.toHaveAttribute("aria-current");
  });

  it("com Todas ativa, só ela é marcada", () => {
    render(<FiltroCategorias opcoes={opcoes} ativa={null} total={20} />);
    expect(screen.getByRole("link", { name: /Todas/ })).toHaveAttribute("aria-current", "page");
  });

  it("sem categorias nos dados não mostra o filtro", () => {
    const { container } = render(<FiltroCategorias opcoes={[]} ativa={null} total={5} />);
    expect(container).toBeEmptyDOMElement();
  });
});
