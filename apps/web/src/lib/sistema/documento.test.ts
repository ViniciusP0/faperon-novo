import { describe, expect, it } from "vitest";
import { FUNCIONARIOS } from "@/content/sistema/funcionarios";
import { completar, modeloPadrao, preencher } from "./documento";

const carla = FUNCIONARIOS.find((f) => f.id === "carla")!;
const contexto = { de: "2026-10-01", ate: "2026-10-31", hoje: "2026-10-17", funcionario: carla };

describe("modelo de documento dos relatórios", () => {
  it("cada tipo tem capa e contracapa próprias", () => {
    expect(modeloPadrao("frota").titulo).toBe("Relatório de Gestão da Frota");
    expect(modeloPadrao("contas").nota.texto).toMatch(/despesas enviadas/);
    expect(modeloPadrao("atividades").serie).toBe("RELATÓRIO DE ATIVIDADES");
  });

  it("troca os marcadores e tira campos e linhas vazios", () => {
    const m = modeloPadrao("frota");
    m.campos.push({ rotulo: "", valor: " " });
    m.creditos.push({ titulo: "", linhas: [""] });
    const p = preencher(m, contexto);
    expect(p.campos).toContainEqual({ rotulo: "Período de análise", valor: "01/10/2026 a 31/10/2026" });
    expect(p.campos).toContainEqual({ rotulo: "Data de emissão", valor: "17/10/2026" });
    expect(p.campos).toHaveLength(4);
    expect(p.creditos.at(-1)).toEqual({ titulo: "Elaboração", linhas: ["Carla Mendes - Comunicação"] });
  });

  it("modelo salvo incompleto é completado com o padrão", () => {
    const m = completar({ titulo: "Meu título", nota: { titulo: "Observação" } as never }, "espacos");
    expect(m.titulo).toBe("Meu título");
    expect(m.nota.titulo).toBe("Observação");
    expect(m.nota.texto).toBe(modeloPadrao("espacos").nota.texto);
    expect(completar(null, "agenda")).toEqual(modeloPadrao("agenda"));
  });
});
