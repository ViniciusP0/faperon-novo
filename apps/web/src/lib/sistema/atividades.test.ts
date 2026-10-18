import { describe, expect, it } from "vitest";
import { FUNCIONARIOS } from "@/content/sistema/funcionarios";
import { anotar, atividadesVisiveis, historicoVisivel, horasDaAtividade, LIMITE_HISTORICO, resumoPorFuncionario, validarAtividade } from "./atividades";
import type { Atividade, RegistroHistorico } from "./tipos";

const carla = FUNCIONARIOS.find((f) => f.id === "carla")!;
const marcos = FUNCIONARIOS.find((f) => f.id === "marcos")!;

function atividade(a: Partial<Atividade> & Pick<Atividade, "id">): Atividade {
  return {
    funcionarioId: "carla",
    data: "2026-10-10",
    inicio: "08:00",
    fim: "10:30",
    tipo: "visita_tecnica",
    titulo: `Atividade ${a.id}`,
    municipio: "Ariquemes",
    publico: 0,
    descricao: "",
    resultados: "",
    criadaEm: "2026-10-10T11:00",
    ...a,
  };
}

const registro = (id: string, funcionarioId: string, quando: string): RegistroHistorico => ({ id, funcionarioId, quando, modulo: "agenda", acao: id });

describe("registro de atividades", () => {
  it("valida título, data, horário e público", () => {
    const ok = atividade({ id: "1" });
    expect(validarAtividade(ok)).toBeNull();
    expect(validarAtividade({ ...ok, titulo: " " })).toBe("Diga qual foi a atividade.");
    expect(validarAtividade({ ...ok, data: "" })).toBe("Informe a data da atividade.");
    expect(validarAtividade({ ...ok, inicio: "" })).toBe("Informe o horário de início e de fim.");
    expect(validarAtividade({ ...ok, fim: "08:00" })).toBe("O fim precisa ser depois do início.");
    expect(validarAtividade({ ...ok, publico: -1 })).toMatch(/número inteiro/);
    expect(validarAtividade({ ...ok, publico: 2.5 })).toMatch(/número inteiro/);
  });

  it("calcula horas e resume por funcionário no período", () => {
    expect(horasDaAtividade({ inicio: "08:00", fim: "10:30" })).toBe(2.5);
    const lista = [
      atividade({ id: "1", publico: 12 }),
      atividade({ id: "2", inicio: "14:00", fim: "15:00", publico: 3 }),
      atividade({ id: "3", funcionarioId: "ana", inicio: "07:00", fim: "17:00", publico: 40 }),
      atividade({ id: "4", data: "2026-09-30" }),
    ];
    expect(resumoPorFuncionario(lista, "2026-10-01", "2026-10-31")).toEqual([
      { funcionarioId: "ana", atividades: 1, horas: 10, publico: 40 },
      { funcionarioId: "carla", atividades: 2, horas: 3.5, publico: 15 },
    ]);
  });

  it("o coordenador vê as atividades e o histórico de todos; os demais, só os próprios", () => {
    const lista = [atividade({ id: "1" }), atividade({ id: "2", funcionarioId: "joao" })];
    expect(atividadesVisiveis(lista, carla).map((a) => a.id)).toEqual(["1"]);
    expect(atividadesVisiveis(lista, marcos)).toHaveLength(2);
    const hist = [registro("a", "carla", "2026-10-10T09:00"), registro("b", "joao", "2026-10-10T10:00"), registro("c", "carla", "2026-10-11T08:00")];
    expect(historicoVisivel(hist, carla).map((r) => r.id)).toEqual(["c", "a"]);
    expect(historicoVisivel(hist, marcos).map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("o histórico guarda só as ações mais recentes", () => {
    let hist: RegistroHistorico[] = [];
    for (let i = 0; i < LIMITE_HISTORICO + 5; i++) hist = anotar(hist, registro(String(i), "carla", "2026-10-10T09:00"));
    expect(hist).toHaveLength(LIMITE_HISTORICO);
    expect(hist[0]!.id).toBe(String(LIMITE_HISTORICO + 4));
  });
});
