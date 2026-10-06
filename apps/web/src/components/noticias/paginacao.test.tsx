import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Paginacao } from "./paginacao";

describe("Paginacao", () => {
  it("não aparece quando há uma página só", () => {
    const { container } = render(<Paginacao pagina={1} totalPaginas={1} categoria={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra Anterior/Próxima e os números, com a página atual marcada", () => {
    render(<Paginacao pagina={2} totalPaginas={3} categoria={null} />);
    const nav = screen.getByRole("navigation", { name: "Paginação" });
    expect(within(nav).getByRole("link", { name: "Página anterior" })).toHaveAttribute("href", "/noticias");
    expect(within(nav).getByRole("link", { name: "Próxima página" })).toHaveAttribute("href", "/noticias?pagina=3");
    expect(within(nav).getByRole("link", { name: "Página 1" })).toHaveAttribute("href", "/noticias");
    expect(within(nav).getByRole("link", { name: "Página 3" })).toHaveAttribute("href", "/noticias?pagina=3");
    expect(within(nav).getByText("2")).toHaveAttribute("aria-current", "page");
  });

  it("na primeira página, Anterior não é link; na última, Próxima não é link", () => {
    const { rerender } = render(<Paginacao pagina={1} totalPaginas={3} categoria={null} />);
    expect(screen.queryByRole("link", { name: "Página anterior" })).toBeNull();
    expect(screen.getByRole("link", { name: "Próxima página" })).toBeInTheDocument();
    rerender(<Paginacao pagina={3} totalPaginas={3} categoria={null} />);
    expect(screen.queryByRole("link", { name: "Próxima página" })).toBeNull();
    expect(screen.getByRole("link", { name: "Página anterior" })).toBeInTheDocument();
  });

  it("mantém a categoria nos endereços", () => {
    render(<Paginacao pagina={1} totalPaginas={2} categoria="geral" />);
    expect(screen.getByRole("link", { name: "Próxima página" })).toHaveAttribute("href", "/noticias?categoria=geral&pagina=2");
    expect(screen.getByRole("link", { name: "Página 2" })).toHaveAttribute("href", "/noticias?categoria=geral&pagina=2");
  });
});
