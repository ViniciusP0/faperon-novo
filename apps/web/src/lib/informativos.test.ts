import { describe, expect, it } from "vitest";
import { INFORMATIVOS } from "@/content/informativos";
import { agruparPorAno, anosDisponiveis, maisRecente } from "./informativos";

const corte = INFORMATIVOS.categorias[0]!.itens;
const leite = INFORMATIVOS.categorias[1]!.itens;

describe("informativos", () => {
  it("maisRecente devolve a edição de data mais alta, mesmo fora de ordem", () => {
    expect(maisRecente(corte).titulo).toBe("Dezembro/2025");
    expect(maisRecente(leite).titulo).toBe("Outubro/2025");
    expect(maisRecente([...corte].reverse()).titulo).toBe("Dezembro/2025");
  });

  it("agruparPorAno separa por ano, do mais novo para o mais antigo", () => {
    const grupos = agruparPorAno(leite);
    expect(grupos.map((g) => [g.ano, g.itens.length])).toEqual([
      [2025, 10],
      [2024, 1],
    ]);
  });

  it("agruparPorAno filtra por ano e devolve vazio para ano sem edições", () => {
    expect(agruparPorAno(leite, 2024).map((g) => g.ano)).toEqual([2024]);
    expect(agruparPorAno(corte, 2024)).toEqual([]);
  });

  it("anosDisponiveis lista os anos de várias categorias sem repetir", () => {
    expect(anosDisponiveis([...corte, ...leite])).toEqual([2025, 2024]);
  });
});
