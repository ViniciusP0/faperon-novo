import { describe, expect, it } from "vitest";
import { podeEditar, totaisPorCentro, validarDespesa } from "./contas";
import type { Despesa } from "./tipos";

function despesa(parcial: Partial<Despesa>): Despesa {
  return {
    id: "d",
    funcionarioId: "carla",
    data: "2026-10-10",
    centro: "Comunicação",
    categoria: "material",
    descricao: "Papel A4",
    fornecedor: "Papelaria Central",
    valor: 120,
    comprovante: null,
    status: "enviada",
    observacaoGestor: "",
    criadaEm: "2026-10-10T10:00",
    ...parcial,
  };
}

describe("prestação de contas", () => {
  it("valida descrição, data e valor positivo", () => {
    expect(validarDespesa(despesa({}))).toBeNull();
    expect(validarDespesa(despesa({ descricao: " " }))).toBe("Descreva a despesa.");
    expect(validarDespesa(despesa({ data: "" }))).toBe("Informe a data da despesa.");
    expect(validarDespesa(despesa({ valor: 0 }))).toBe("Informe um valor maior que zero.");
    expect(validarDespesa(despesa({ valor: Number.NaN }))).toBe("Informe um valor maior que zero.");
  });

  it("só o dono edita, e só rascunho ou devolvida", () => {
    expect(podeEditar(despesa({ status: "rascunho" }), "carla")).toBe(true);
    expect(podeEditar(despesa({ status: "devolvida" }), "carla")).toBe(true);
    expect(podeEditar(despesa({ status: "enviada" }), "carla")).toBe(false);
    expect(podeEditar(despesa({ status: "rascunho" }), "joao")).toBe(false);
  });

  it("totais por centro e categoria contam enviadas e aprovadas no período", () => {
    const lista = [
      despesa({ id: "1", valor: 100, status: "aprovada" }),
      despesa({ id: "2", valor: 50, status: "enviada", categoria: "alimentacao" }),
      despesa({ id: "3", valor: 999, status: "rascunho" }),
      despesa({ id: "4", valor: 999, status: "devolvida" }),
      despesa({ id: "5", valor: 30, status: "aprovada", centro: "Técnica" }),
      despesa({ id: "6", valor: 999, status: "aprovada", data: "2026-09-30" }),
    ];
    const totais = totaisPorCentro(lista, "2026-10-01", "2026-10-31");
    expect(totais).toEqual([
      { centro: "Comunicação", total: 150, porCategoria: { material: 100, alimentacao: 50 } },
      { centro: "Técnica", total: 30, porCategoria: { material: 30 } },
    ]);
  });
});
