import { describe, expect, it } from "vitest";
import { manchetePainel, medida } from "./manchete-painel";

const sp = (s: string) => s.replace(/ /g, " ");

describe("medida", () => {
  it("escreve milhões por extenso com 'de' antes da unidade", () => {
    const m = medida(1_234_567, "Toneladas");
    expect(m.numero).toBe(sp("1,2 milhão"));
    expect(m.texto).toBe(sp("1,2 milhão de toneladas"));
  });

  it("não usa 'de' para milhares", () => {
    expect(medida(15_000, "Hectares").texto).toBe(sp("15 mil hectares"));
  });

  it("mantém o número inteiro abaixo de 10 mil", () => {
    expect(medida(3503.7, "Quilogramas por Hectare").texto).toBe(sp("3.504 quilogramas por hectare"));
  });

  it("converte Mil Reais em reais", () => {
    const m = medida(1_200_000, "Mil Reais");
    expect(m.numero).toBe(sp("R$ 1,2 bilhão"));
    expect(m.unidade).toBe("");
    expect(m.texto).toBe(sp("R$ 1,2 bilhão"));
  });

  it("converte Mil litros em litros", () => {
    expect(medida(5000, "Mil litros").texto).toBe(sp("5 milhões de litros"));
  });
});

const base = { produto: "Soja (em grão)", indicadorNome: "Quantidade produzida", unidade: "Toneladas", valor: 2_000_000, ano: 2024 };
const juntar = (p: { texto: string }[] | null) => p?.map((x) => x.texto).join("");

describe("manchetePainel", () => {
  it("escolhe o verbo pelo indicador e marca o número", () => {
    const partes = manchetePainel({ ...base, indicadorSlug: "quantidade-produzida" })!;
    expect(juntar(partes)).toBe(sp("Em 2024, Rondônia produziu 2 milhões de toneladas de soja (em grão)."));
    expect(partes.filter((p) => p.destaque).map((p) => p.texto)).toEqual([sp("2 milhões de toneladas")]);
  });

  it("cita o município quando há território", () => {
    const partes = manchetePainel({ ...base, indicadorSlug: "area-colhida", territorio: "Vilhena" });
    expect(juntar(partes)).toContain("Em 2024, Vilhena colheu");
  });

  it("usa a forma neutra para indicadores sem frase própria", () => {
    const partes = manchetePainel({ ...base, indicadorSlug: "rendimento-medio", indicadorNome: "Rendimento médio", unidade: "Quilogramas por Hectare", valor: 3503.7 });
    expect(juntar(partes)).toBe(sp("Rendimento médio de soja (em grão) em Rondônia, 2024: 3.504 quilogramas por hectare."));
  });

  it("devolve null quando o valor é sigiloso ou ausente", () => {
    expect(manchetePainel({ ...base, indicadorSlug: "quantidade-produzida", valor: null, status: "sigiloso" })).toBeNull();
  });
});
