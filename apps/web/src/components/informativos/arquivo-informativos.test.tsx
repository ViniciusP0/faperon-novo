import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { INFORMATIVOS } from "@/content/informativos";
import { ArquivoInformativos } from "./arquivo-informativos";

const edicoes = () => within(screen.getByRole("tabpanel")).getAllByRole("button");
const links = () => within(screen.getByRole("tabpanel")).getAllByRole("link");

async function abrirLista(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Lista" }));
}

describe("ArquivoInformativos", () => {
  it("começa em Corte, com todos os anos e as capas como forma de ver", () => {
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    expect(screen.getByRole("tab", { name: "Bovinocultura de Corte" })).toHaveAttribute("aria-selected", "true");
    expect(edicoes()).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Capas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("trocar para Leite mostra as 11 edições e os anos 2025 e 2024", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await user.click(screen.getByRole("tab", { name: "Bovinocultura de Leite" }));
    expect(edicoes()).toHaveLength(11);
    expect(screen.getByRole("button", { name: "2024" })).toBeInTheDocument();
  });

  it("o filtro por ano reduz as edições; trocar de categoria volta para Todos", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await user.click(screen.getByRole("tab", { name: "Bovinocultura de Leite" }));
    await user.click(screen.getByRole("button", { name: "2024" }));
    expect(edicoes()).toHaveLength(1);
    expect(edicoes()[0]).toHaveAccessibleName(/Dezembro\/2024/);

    await user.click(screen.getByRole("tab", { name: "Bovinocultura de Corte" }));
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(edicoes()).toHaveLength(12);
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

  it("a visão Lombadas mostra uma lombada por edição", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await user.click(screen.getByRole("button", { name: "Lombadas" }));
    expect(screen.getByRole("button", { name: "Lombadas" })).toHaveAttribute("aria-pressed", "true");
    expect(edicoes()).toHaveLength(12);
  });

  it("a visão Lista traz um link por edição, abrindo o PDF em nova aba com rel seguro", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await abrirLista(user);
    expect(links()).toHaveLength(12);
    for (const a of links()) {
      expect(a).toHaveAttribute("href", expect.stringMatching(/\.pdf$/));
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("clicar numa capa abre a pré-visualização com o botão de baixar o PDF", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await user.click(screen.getByRole("button", { name: /Bovinocultura de Corte, Dezembro\/2025/ }));
    const janela = screen.getByRole("dialog", { name: /Bovinocultura de Corte – Dezembro\/2025/ });
    expect(within(janela).getByRole("link", { name: /Baixar Dezembro\/2025/ })).toHaveAttribute("href", expect.stringMatching(/\.pdf$/));
    expect(within(janela).getByRole("button", { name: /Próxima edição/ })).toBeDisabled();
  });

  it("na pré-visualização dá para folhear para a edição anterior e fechar", async () => {
    const user = userEvent.setup();
    render(<ArquivoInformativos categorias={INFORMATIVOS.categorias} />);
    await user.click(screen.getByRole("button", { name: /Bovinocultura de Corte, Dezembro\/2025/ }));
    await user.click(screen.getByRole("button", { name: /Edição anterior: Novembro\/2025/ }));
    expect(screen.getByRole("dialog", { name: /Novembro\/2025/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Próxima edição: Dezembro\/2025/ })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Fechar pré-visualização" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
