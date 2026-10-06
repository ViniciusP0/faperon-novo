import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { definirMovimentoReduzido, instalarObserverFalso } from "@/test/mock-observer";
import { NumeroAnimado } from "./numero-animado";

afterEach(() => vi.unstubAllGlobals());

function instalarRaf() {
  const fila: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    fila.push(cb);
    return fila.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return {
    quadro(t: number) {
      const atuais = fila.splice(0);
      act(() => atuais.forEach((cb) => cb(t)));
    },
  };
}

const visivel = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]')!.textContent;
const paraLeitor = (c: HTMLElement) => c.querySelector(".sr-only")!.textContent;

describe("NumeroAnimado", () => {
  it("sem IntersectionObserver mostra o valor final", () => {
    const { container } = render(<NumeroAnimado valor="52" />);
    expect(visivel(container)).toBe("52");
    expect(paraLeitor(container)).toBe("52");
  });

  it("com movimento reduzido mostra o valor final e não cria observer", () => {
    definirMovimentoReduzido(true);
    const obs = instalarObserverFalso();
    const { container } = render(<NumeroAnimado valor="52" />);
    expect(visivel(container)).toBe("52");
    expect(obs.instancias).toHaveLength(0);
  });

  it("conta de 0 até o valor ao entrar na tela, e o leitor de tela sempre lê o valor final", () => {
    const obs = instalarObserverFalso();
    const raf = instalarRaf();
    const { container } = render(<NumeroAnimado valor="52" duracao={1000} />);

    expect(visivel(container)).toBe("0");
    expect(paraLeitor(container)).toBe("52");

    obs.disparar();
    raf.quadro(1000); // primeiro quadro: início da contagem
    raf.quadro(1500); // metade do tempo
    const meio = Number(visivel(container));
    expect(meio).toBeGreaterThan(0);
    expect(meio).toBeLessThan(52);
    expect(paraLeitor(container)).toBe("52");

    raf.quadro(2100);
    expect(visivel(container)).toBe("52");
  });

  it("mantém casas decimais e sufixo durante e depois da contagem", () => {
    const obs = instalarObserverFalso();
    const raf = instalarRaf();
    const { container } = render(<NumeroAnimado valor="3,4 mi" duracao={1000} />);
    expect(visivel(container)).toBe("0,0 mi");

    obs.disparar();
    raf.quadro(0);
    raf.quadro(500);
    expect(visivel(container)).toMatch(/^\d,\d mi$/);

    raf.quadro(1500);
    expect(visivel(container)).toBe("3,4 mi");
  });

  it("texto sem número (X, –) aparece como veio e não anima", () => {
    const obs = instalarObserverFalso();
    const { container } = render(<NumeroAnimado valor="–" />);
    expect(visivel(container)).toBe("–");
    obs.disparar();
    expect(visivel(container)).toBe("–");
  });
});
