import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaixaNumeros } from "./faixa-numeros";

describe("FaixaNumeros", () => {
  it("mostra rótulo, valor e detalhe de cada número", () => {
    render(
      <FaixaNumeros
        rotulo="A FAPERON em números"
        itens={[
          { rotulo: "Fundação", valor: "1983", detalhe: "mais de 40 anos" },
          { rotulo: "Municípios", valor: "52", detalhe: "em todo o estado", animar: true },
        ]}
      />,
    );
    expect(screen.getByRole("region", { name: "A FAPERON em números" })).toBeInTheDocument();
    expect(screen.getByText("1983")).toBeInTheDocument();
    expect(screen.getAllByText("52").length).toBeGreaterThan(0);
    expect(screen.getByText("em todo o estado")).toBeInTheDocument();
  });

  it("só anima os itens marcados com animar (um ano nunca conta de 0)", () => {
    const { container } = render(
      <FaixaNumeros
        rotulo="Números"
        itens={[
          { rotulo: "Fundação", valor: "1983", detalhe: "x" },
          { rotulo: "Municípios", valor: "52", detalhe: "y", animar: true },
        ]}
      />,
    );
    expect(container.querySelectorAll(".sr-only")).toHaveLength(1); // só o item animado tem a cópia para leitores de tela
  });
});
