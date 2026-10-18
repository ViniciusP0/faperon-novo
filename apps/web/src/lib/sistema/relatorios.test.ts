import { describe, expect, it } from "vitest";
import { FUNCIONARIOS } from "@/content/sistema/funcionarios";
import { paraCSV, relatorioAgenda, relatorioAtividades, relatorioContas, relatorioEspacos, relatorioFrota, type Relatorio } from "./relatorios";
import type { Atividade, Despesa, EstadoFrota, Evento, PedidoEspaco } from "./tipos";

const carla = FUNCIONARIOS.find((f) => f.id === "carla")!;
const marcos = FUNCIONARIOS.find((f) => f.id === "marcos")!;

const frota: EstadoFrota = {
  veiculos: [
    { id: "v1", placa: "ABC1D23", modelo: "Hilux", ano: 2022, km: 50000 },
    { id: "v2", placa: "XYZ9K87", modelo: "Gol", ano: 2020, km: 80000 },
  ],
  reservas: [
    { id: "r1", veiculoId: "v1", funcionarioId: "carla", saida: "2026-10-02T07:00", retorno: "2026-10-02T18:00", destino: "Cacoal", motivo: "", kmInicial: 50000, kmFinal: 50480, situacao: "concluida" },
    { id: "r2", veiculoId: "v1", funcionarioId: "ana", saida: "2026-10-20T07:00", retorno: "2026-10-20T18:00", destino: "Ji-Paraná", motivo: "", kmInicial: null, kmFinal: null, situacao: "agendada" },
    { id: "r3", veiculoId: "v1", funcionarioId: "ana", saida: "2026-10-05T07:00", retorno: "2026-10-05T18:00", destino: "Ariquemes", motivo: "", kmInicial: null, kmFinal: null, situacao: "cancelada" },
    { id: "r4", veiculoId: "v1", funcionarioId: "ana", saida: "2026-09-10T07:00", retorno: "2026-09-10T18:00", destino: "Fora", motivo: "", kmInicial: 1, kmFinal: 999, situacao: "concluida" },
  ],
  abastecimentos: [{ id: "a1", veiculoId: "v1", funcionarioId: "carla", data: "2026-10-02", litros: 60.5, valor: 380.15, km: 50300 }],
  manutencoes: [{ id: "m1", veiculoId: "v2", data: "2026-10-08", tipo: "pneus", valor: 1200, km: 80000, concluida: true }],
};

function pedido(p: Partial<PedidoEspaco> & Pick<PedidoEspaco, "id">): PedidoEspaco {
  return {
    espacoId: "auditorio",
    funcionarioId: "carla",
    data: "2026-10-10",
    periodo: "horario",
    inicio: "08:00",
    fim: "12:00",
    tipo: "palestra",
    nome: `Evento ${p.id}`,
    participantes: 50,
    coffeeBreak: false,
    observacoes: "",
    status: "aprovado",
    motivoRecusa: "",
    criadoEm: "2026-10-01T10:00",
    ...p,
  };
}

function despesa(d: Partial<Despesa> & Pick<Despesa, "id">): Despesa {
  return {
    funcionarioId: "carla",
    data: "2026-10-10",
    centro: "Comunicação",
    categoria: "material",
    descricao: `Despesa ${d.id}`,
    fornecedor: "",
    valor: 100,
    comprovante: null,
    status: "aprovada",
    observacaoGestor: "",
    criadaEm: "2026-10-10T10:00",
    ...d,
  };
}

describe("relatórios", () => {
  it("frota soma viagens, km, combustível e manutenção do período por veículo", () => {
    const r = relatorioFrota(frota, "2026-10-01", "2026-10-31");
    expect(r.linhas[0]).toEqual(["Hilux (ABC1D23)", 2, 480, 60.5, 380.15, 0, 380.15, 0.79]);
    expect(r.linhas[1]).toEqual(["Gol (XYZ9K87)", 0, 0, 0, 0, 1200, 1200, null]);
    expect(r.total).toEqual(["Total", 2, 480, 60.5, 380.15, 1200, 1580.15, 3.29]);
  });

  it("espaços contam status, horas aprovadas e pendentes em conflito", () => {
    const r = relatorioEspacos(
      [
        pedido({ id: "1" }),
        pedido({ id: "2", status: "pendente", inicio: "10:00", fim: "11:00" }),
        pedido({ id: "3", status: "recusado" }),
        pedido({ id: "4", status: "cancelado" }),
        pedido({ id: "5", espacoId: "hub", inicio: "13:00", fim: "14:30", participantes: 12 }),
        pedido({ id: "6", data: "2026-11-02" }),
        pedido({ id: "7", status: "devolvido", correcao: "Trocar o horário" }),
      ],
      "2026-10-01",
      "2026-10-31",
    );
    expect(r.linhas.find((l) => l[0] === "Auditório")).toEqual(["Auditório", 4, 1, 1, 1, 1, 4, 50, 1]);
    expect(r.total).toEqual(["Total", 5, 2, 1, 1, 1, 5.5, 62, 1]);
  });

  it("agenda lista os eventos do período em ordem", () => {
    const itens: Evento[] = [
      { id: "a", titulo: "Reunião do conselho", data: "2026-10-05", inicio: "09:00", fim: "11:00", local: "Sede", descricao: "", tipo: "reuniao", origem: "faperon" },
      { id: "b", titulo: "Fora do período", data: "2026-11-05", inicio: "09:00", fim: "11:00", local: "", descricao: "", tipo: "reuniao", origem: "pessoal" },
      { id: "c", titulo: "Viagem a Cacoal", data: "2026-10-07", inicio: "07:00", fim: "18:00", local: "Hilux", descricao: "", tipo: "viagem", origem: "frota" },
    ];
    const r = relatorioAgenda(itens, "2026-10-01", "2026-10-31");
    expect(r.linhas).toEqual([
      ["05/10/2026", "09:00–11:00", "Reunião do conselho", "Reunião", "FAPERON", "Sede"],
      ["07/10/2026", "07:00–18:00", "Viagem a Cacoal", "Viagem", "Frota", "Hilux"],
    ]);
    expect(r.resumo[0]).toBe("2 evento(s): 1 reunião, 1 viagem.");
  });

  it("contas: o funcionário vê só as próprias; o gestor vê todas, com o nome", () => {
    const lista = [
      despesa({ id: "1", valor: 100 }),
      despesa({ id: "2", valor: 50, status: "enviada" }),
      despesa({ id: "3", valor: 70, status: "rascunho" }),
      despesa({ id: "4", valor: 30, funcionarioId: "joao" }),
    ];
    const daCarla = relatorioContas(lista, carla, "2026-10-01", "2026-10-31");
    expect(daCarla.linhas).toHaveLength(3);
    expect(daCarla.total!.at(-1)).toBe(150);
    const doGestor = relatorioContas(lista, marcos, "2026-10-01", "2026-10-31");
    expect(doGestor.linhas).toHaveLength(4);
    expect(doGestor.colunas[1]!.rotulo).toBe("Funcionário");
    expect(doGestor.linhas.some((l) => l[1] === "João Pereira")).toBe(true);
    expect(doGestor.total!.at(-1)).toBe(180);
  });

  it("CSV usa ; , vírgula decimal, BOM e neutraliza fórmulas", () => {
    const r: Relatorio = {
      titulo: "t",
      resumo: [],
      colunas: [
        { rotulo: "Nome", formato: "texto" },
        { rotulo: "Valor", formato: "reais" },
        { rotulo: "Km", formato: "km" },
      ],
      linhas: [
        ["=HYPERLINK(\"x\")", 1234.5, 480],
        ["Papel; A4", null, 0],
      ],
      total: ["Total", 1234.5, 480],
    };
    expect(paraCSV(r)).toBe('﻿Nome;Valor;Km\r\n"\'=HYPERLINK(""x"")";1234,50;480\r\n"Papel; A4";;0\r\nTotal;1234,50;480\r\n');
  });

  it("atividades: horas e público; o coordenador vê a equipe com o nome", () => {
    const base: Atividade = { id: "a", funcionarioId: "carla", data: "2026-10-05", inicio: "08:00", fim: "10:30", tipo: "visita_tecnica", titulo: "Visita", municipio: "Cacoal", publico: 9, descricao: "", resultados: "Encaminhou 3", criadaEm: "" };
    const lista = [base, { ...base, id: "b", funcionarioId: "ana", inicio: "14:00", fim: "15:00", tipo: "reuniao" as const, publico: 0 }, { ...base, id: "c", data: "2026-11-01" }];
    const daCarla = relatorioAtividades(lista, carla, "2026-10-01", "2026-10-31");
    expect(daCarla.linhas).toEqual([["05/10/2026", "08:00–10:30", "Visita técnica", "Visita", "Cacoal", "Encaminhou 3", 9, 2.5]]);
    expect(daCarla.total).toEqual(["Total", "", "", "", "", "", 9, 2.5]);
    const daEquipe = relatorioAtividades(lista, marcos, "2026-10-01", "2026-10-31");
    expect(daEquipe.titulo).toBe("Atividades da equipe");
    expect(daEquipe.linhas.map((l) => l[2])).toEqual(["Carla Mendes", "Ana Ribeiro"]);
    expect(daEquipe.total!.at(-1)).toBe(3.5);
    expect(daEquipe.resumo[1]).toBe("Por tipo: 1 visita técnica, 1 reunião.");
  });
});
