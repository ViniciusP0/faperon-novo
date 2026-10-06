import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { definirMovimentoReduzido, definirTopoDosElementos, instalarObserverFalso } from "@/test/mock-observer";
import { Revelar } from "./revelar";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Revelar", () => {
  it("abaixo da dobra: fica pendente até entrar na tela, revela uma única vez e solta o observer", () => {
    const obs = instalarObserverFalso();
    render(<Revelar data-testid="r">Olá</Revelar>);
    const el = screen.getByTestId("r");
    expect(el).toHaveClass("revelar", "revelar-pendente");

    obs.disparar();
    expect(el).not.toHaveClass("revelar-pendente");
    expect(obs.instancias[0]!.disconnect).toHaveBeenCalled();
  });

  it("já visível ao montar (acima da dobra): nunca esconde nem observa, para não piscar", () => {
    const obs = instalarObserverFalso();
    definirTopoDosElementos(200);
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).not.toHaveClass("revelar-pendente");
    expect(obs.instancias).toHaveLength(0);
  });

  it("já rolado para além do elemento (link direto para uma âncora mais abaixo): não esconde", () => {
    instalarObserverFalso();
    definirTopoDosElementos(-800);
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).not.toHaveClass("revelar-pendente");
  });

  it("sem IntersectionObserver o conteúdo nunca fica pendente", () => {
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).not.toHaveClass("revelar-pendente");
  });

  it("com movimento reduzido nunca fica pendente e não cria observer", () => {
    definirMovimentoReduzido(true);
    const obs = instalarObserverFalso();
    render(<Revelar data-testid="r">Olá</Revelar>);
    expect(screen.getByTestId("r")).not.toHaveClass("revelar-pendente");
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
