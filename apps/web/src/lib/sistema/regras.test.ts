import { describe, expect, it } from "vitest";
import { custosPorMes } from "./custos";
import { gradeDoMes, somarDias, sobrepoe } from "./datas";
import { normalizarPlaca, placaValida } from "./placa";
import { conflitoDeReserva, situacaoDoVeiculo, validarRetorno } from "./reservas";
import { alertaDeRevisao } from "./revisao";
import type { Abastecimento, Manutencao, Reserva, Veiculo } from "./tipos";

const veiculo: Veiculo = { id: "v1", placa: "ABC1D23", modelo: "Hilux", ano: 2022, km: 45_000 };

function reserva(parcial: Partial<Reserva>): Reserva {
  return {
    id: "r",
    veiculoId: "v1",
    funcionarioId: "f1",
    saida: "2026-10-20T08:00",
    retorno: "2026-10-20T18:00",
    destino: "Ji-Paraná",
    motivo: "Dia de campo",
    kmInicial: null,
    kmFinal: null,
    situacao: "agendada",
    ...parcial,
  };
}

function manutencao(parcial: Partial<Manutencao>): Manutencao {
  return { id: "m", veiculoId: "v1", data: "2026-01-10", tipo: "revisao", valor: 900, km: 40_000, concluida: true, ...parcial };
}

describe("datas", () => {
  it("grade de outubro de 2026 começa no domingo 27/09 e tem semanas completas", () => {
    const grade = gradeDoMes(2026, 9);
    expect(grade[0]![0]).toBe("2026-09-27");
    expect(grade.every((semana) => semana.length === 7)).toBe(true);
    expect(grade.flat()).toContain("2026-10-31");
    expect(grade.at(-1)!.at(-1)).toBe("2026-10-31");
    expect(grade).toHaveLength(5);
  });

  it("somarDias atravessa meses", () => {
    expect(somarDias("2026-10-30", 3)).toBe("2026-11-02");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("intervalos que só se encostam não se sobrepõem", () => {
    expect(sobrepoe("2026-10-20T08:00", "2026-10-20T12:00", "2026-10-20T12:00", "2026-10-20T18:00")).toBe(false);
    expect(sobrepoe("2026-10-20T08:00", "2026-10-20T12:01", "2026-10-20T12:00", "2026-10-20T18:00")).toBe(true);
  });
});

describe("placa", () => {
  it.each(["ABC-1234", "abc1234", "ABC1D23", "abc1d23"])("aceita %s", (p) => {
    expect(placaValida(p)).toBe(true);
  });

  it.each(["AB-1234", "ABCD123", "ABC12345", "1BC1234", ""])("recusa %s", (p) => {
    expect(placaValida(p)).toBe(false);
  });

  it("normaliza para maiúsculas sem hífen", () => {
    expect(normalizarPlaca(" abc-1234 ")).toBe("ABC1234");
  });
});

describe("reservas", () => {
  const existentes = [reserva({ id: "r1" })];

  it("recusa choque de horário no mesmo veículo", () => {
    expect(conflitoDeReserva(reserva({ id: "n", saida: "2026-10-20T17:00", retorno: "2026-10-21T10:00" }), existentes, [])).toBe("choque");
  });

  it("reserva que começa quando a outra termina não conflita", () => {
    expect(conflitoDeReserva(reserva({ id: "n", saida: "2026-10-20T18:00", retorno: "2026-10-20T20:00" }), existentes, [])).toBeNull();
  });

  it("ignora reservas canceladas e de outro veículo", () => {
    const outras = [reserva({ id: "c", situacao: "cancelada" }), reserva({ id: "o", veiculoId: "v2" })];
    expect(conflitoDeReserva(reserva({ id: "n" }), outras, [])).toBeNull();
  });

  it("recusa veículo com manutenção em aberto", () => {
    const aberta = manutencao({ data: "2026-10-19", concluida: false });
    expect(conflitoDeReserva(reserva({ id: "n" }), [], [aberta])).toBe("manutencao");
  });

  it("situação do veículo: manutenção aberta, em uso, reservado agora ou disponível", () => {
    expect(situacaoDoVeiculo(veiculo, [], [manutencao({ concluida: false, data: "2026-10-01" })], "2026-10-20T09:00")).toBe("em_manutencao");
    expect(situacaoDoVeiculo(veiculo, [reserva({ situacao: "em_uso" })], [], "2026-10-25T09:00")).toBe("reservado");
    expect(situacaoDoVeiculo(veiculo, existentes, [], "2026-10-20T09:00")).toBe("reservado");
    expect(situacaoDoVeiculo(veiculo, existentes, [], "2026-10-21T09:00")).toBe("disponivel");
  });

  it("km de retorno não pode ser menor que o de saída", () => {
    expect(validarRetorno(45_000, 44_999)).toBe("O km de retorno não pode ser menor que o de saída.");
    expect(validarRetorno(45_000, 45_000)).toBeNull();
  });
});

describe("revisão", () => {
  it("vencida por km", () => {
    const r = alertaDeRevisao({ ...veiculo, km: 50_500 }, [manutencao({ km: 40_000, data: "2026-06-01" })], "2026-10-17");
    expect(r).toEqual({ estado: "vencida", proximaKm: 50_000, proximaData: "2027-06-01" });
  });

  it("vencida por data", () => {
    expect(alertaDeRevisao(veiculo, [manutencao({ km: 44_000, data: "2025-09-01" })], "2026-10-17").estado).toBe("vencida");
  });

  it("próxima a menos de 1.000 km ou 30 dias", () => {
    expect(alertaDeRevisao({ ...veiculo, km: 49_200 }, [manutencao({ km: 40_000, data: "2026-06-01" })], "2026-10-17").estado).toBe("proxima");
    expect(alertaDeRevisao(veiculo, [manutencao({ km: 44_000, data: "2025-11-01" })], "2026-10-17").estado).toBe("proxima");
  });

  it("em dia, usando só a última revisão concluída", () => {
    const historico = [manutencao({ km: 20_000, data: "2024-01-01" }), manutencao({ km: 44_000, data: "2026-09-01" }), manutencao({ tipo: "pneus", km: 45_000, data: "2026-10-01" })];
    expect(alertaDeRevisao(veiculo, historico, "2026-10-17")).toEqual({ estado: "ok", proximaKm: 54_000, proximaData: "2027-09-01" });
  });
});

describe("custos", () => {
  const abastecimentos: Abastecimento[] = [
    { id: "a1", veiculoId: "v1", funcionarioId: "f1", data: "2026-10-03", litros: 50, valor: 300, km: 45_000 },
    { id: "a2", veiculoId: "v2", funcionarioId: "f1", data: "2026-10-05", litros: 40, valor: 250, km: 10_000 },
    { id: "a3", veiculoId: "v1", funcionarioId: "f1", data: "2026-08-10", litros: 30, valor: 180, km: 44_000 },
  ];
  const manutencoes = [manutencao({ data: "2026-10-12", valor: 900 })];
  const reservas = [reserva({ situacao: "concluida", retorno: "2026-10-20T18:00", kmInicial: 45_000, kmFinal: 45_400 })];

  it("soma por mês do veículo, com meses vazios e custo por km", () => {
    const meses = custosPorMes(abastecimentos, manutencoes, reservas, "v1", "2026-10", 3);
    expect(meses).toEqual([
      { mes: "2026-08", combustivel: 180, manutencao: 0, total: 180, km: 0, custoPorKm: null },
      { mes: "2026-09", combustivel: 0, manutencao: 0, total: 0, km: 0, custoPorKm: null },
      { mes: "2026-10", combustivel: 300, manutencao: 900, total: 1200, km: 400, custoPorKm: 3 },
    ]);
  });

  it("sem veículo, soma a frota inteira", () => {
    expect(custosPorMes(abastecimentos, manutencoes, reservas, null, "2026-10", 1)[0]!.combustivel).toBe(550);
  });
});
