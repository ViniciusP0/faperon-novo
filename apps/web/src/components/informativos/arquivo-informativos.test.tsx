import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { INFORMATIVOS } from "@/content/informativos";
import { ArquivoInformativos } from "./arquivo-informativos";

const links = () => screen.getAllByRole("link");

describe("ArquivoInformativos", () => {
  it("começa em Corte com todos os anos", () => {
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    expect(screen.getByRole("tab", { name: "Bovinocultura de Corte" })).toHaveAttribute("aria-selected", "true");
    expect(links()).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("trocar para Leite mostra as 11 edições e os anos 2025 e 2024", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await user.click(screen.getByRole("tab", { name: "Bovinocultura de Leite" }));
    expect(links()).toHaveLength(11);
    expect(screen.getByRole("button", { name: "2024" })).toBeInTheDocument();
  });

  it("o filtro por ano reduz a lista; trocar de categoria volta para Todos", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await user.click(screen.getByRole("tab", { name: "Bovinocultura de Leite" }));
    await user.click(screen.getByRole("button", { name: "2024" }));
    expect(links()).toHaveLength(1);
    expect(within(screen.getByRole("tabpanel")).getByRole("link")).toHaveAccessibleName(/Dezembro\/2024/);

    await user.click(screen.getByRole("tab", { name: "Bovinocultura de Corte" }));
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(links()).toHaveLength(12);
  });

  it("as setas, Home e End trocam de aba movendo o foco, e só a aba ativa entra no Tab", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    const corte = screen.getByRole("tab", { name: "Bovinocultura de Corte" });
    const leite = screen.getByRole("tab", { name: "Bovinocultura de Leite" });
    expect(corte).toHaveAttribute("tabindex", "0");
    expect(leite).toHaveAttribute("tabindex", "-1");

    corte.focus();
    await user.keyboard("{ArrowRight}");
    expect(leite).toHaveAttribute("aria-selected", "true");
    expect(leite).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(corte).toHaveFocus();
    await user.keyboard("{End}");
    expect(leite).toHaveFocus();
    await user.keyboard("{Home}");
    expect(corte).toHaveFocus();
  });

  it("cada link abre o PDF em nova aba com rel seguro", () => {
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    for (const a of links()) {
      expect(a).toHaveAttribute("href", expect.stringMatching(/\.pdf$/));
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
