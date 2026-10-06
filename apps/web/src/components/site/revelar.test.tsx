import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { definirMovimentoReduzido, instalarObserverFalso } from "@/test/mock-observer";
import { Revelar } from "./revelar";

afterEach(() => vi.unstubAllGlobals());

describe("Revelar", () => {
  it("mantém o conteúdo oculto até entrar na tela e revela uma única vez", () => {
    const obs = instalarObserverFalso();
    render(<Revelar data-testid="r">Olá</Revelar>);
    const el = screen.getByTestId("r");
    expect(el).toHaveClass("revelar");
    expect(el).not.toHaveClass("revelar-visivel");

    obs.disparar();
    expect(el).toHaveClass("revelar-visivel");
    expect(obs.instancias[0]!.disconnect).toHaveBeenCalled();
  });

  it("revela na hora quando o navegador não tem IntersectionObserver", () => {
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).toHaveClass("revelar-visivel");
  });

  it("revela na hora com movimento reduzido, sem criar observer", () => {
    definirMovimentoReduzido(true);
    const obs = instalarObserverFalso();
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).toHaveClass("revelar-visivel");
    expect(obs.instancias).toHaveLength(0);
  });

  it("escalona 60 ms por item, com teto de 4 itens", () => {
    render(
      <>
        <Revelar data-testid="a" indice={0} />
        <Revelar data-testid="b" indice={2} />
        <Revelar data-testid="c" indice={9} />
      </>,
    );
    expect(screen.getByTestId("a").style.transitionDelay).toBe("");
    expect(screen.getByTestId("b").style.transitionDelay).toBe("120ms");
    expect(screen.getByTestId("c").style.transitionDelay).toBe("180ms");
  });

  it("renderiza a tag pedida e repassa atributos (id, aria, classe)", () => {
    render(
      <Revelar as="section" id="x" aria-labelledby="t" className="mt-4" data-testid="r">
        <h2 id="t">Título</h2>
      </Revelar>,
    );
    const el = screen.getByTestId("r");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveAttribute("id", "x");
    expect(el).toHaveAttribute("aria-labelledby", "t");
    expect(el).toHaveClass("mt-4", "revelar");
  });
});
