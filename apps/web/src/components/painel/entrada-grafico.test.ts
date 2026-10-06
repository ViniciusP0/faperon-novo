import { beforeEach, describe, expect, it } from "vitest";
import { consumirEntrada, reiniciarEntradas } from "./entrada-grafico";

beforeEach(() => reiniciarEntradas());

describe("consumirEntrada", () => {
  it("autoriza a animação de entrada uma única vez por gráfico, mesmo que a instância seja remontada", () => {
    expect(consumirEntrada("serie")).toBe(true);
    expect(consumirEntrada("serie")).toBe(false); // filtro novo: o gráfico remonta depois do skeleton e não reanima
    expect(consumirEntrada("serie")).toBe(false);
  });

  it("cada gráfico tem a sua própria entrada", () => {
    expect(consumirEntrada("serie")).toBe(true);
    expect(consumirEntrada("comparacao")).toBe(true);
  });

  it("sem identificador, sempre autoriza (a instância controla sozinha)", () => {
    expect(consumirEntrada()).toBe(true);
    expect(consumirEntrada()).toBe(true);
  });
});
