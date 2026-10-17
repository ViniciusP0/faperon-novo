import { afterEach, describe, expect, it, vi } from "vitest";
import type { Evento, PedidoEspaco, Reserva } from "./tipos";
import { aplicarEspaco, aplicarEvento, aplicarReserva, interpretar } from "./voz";

const evento: Evento = { id: "e", titulo: "", data: "2026-10-17", inicio: "09:00", fim: "10:00", local: "", descricao: "", tipo: "reuniao", origem: "pessoal" };
const reserva: Reserva = { id: "r", veiculoId: "", funcionarioId: "carla", saida: "2026-10-18T08:00", retorno: "2026-10-18T18:00", destino: "", motivo: "", kmInicial: null, kmFinal: null, situacao: "agendada" };
const pedido: PedidoEspaco = {
  id: "p",
  espacoId: "sala-reunioes",
  funcionarioId: "carla",
  data: "2026-10-18",
  periodo: "manha",
  inicio: "08:00",
  fim: "12:00",
  tipo: "reuniao",
  nome: "",
  participantes: 0,
  coffeeBreak: false,
  observacoes: "",
  status: "pendente",
  motivoRecusa: "",
  criadoEm: "2026-10-17T10:00",
};

afterEach(() => vi.unstubAllGlobals());

describe("agendamento por voz", () => {
  it("evento: o que veio preenchido sobrescreve; vazio mantém o padrão", () => {
    expect(aplicarEvento(evento, { titulo: "Reunião com o sindicato", data: "2026-10-20", inicio: "14:00", fim: "", local: "", tipo: "viagem", descricao: "" })).toMatchObject({
      titulo: "Reunião com o sindicato",
      data: "2026-10-20",
      inicio: "14:00",
      fim: "10:00",
      tipo: "viagem",
      origem: "pessoal",
    });
  });

  it("reserva: monta saída e retorno; sem data de retorno volta no dia da saída", () => {
    const r = aplicarReserva(reserva, { veiculoId: "v1", dataSaida: "2026-10-22", horaSaida: "07:00", dataRetorno: "", horaRetorno: "", destino: "Cacoal", motivo: "" });
    expect(r).toMatchObject({ veiculoId: "v1", saida: "2026-10-22T07:00", retorno: "2026-10-22T18:00", destino: "Cacoal" });
  });

  it("espaço: período fixo resolve o horário; horário explícito vem da fala", () => {
    const base = { espacoId: "auditorio" as const, data: "2026-10-20", tipo: "palestra" as const, nome: "Palestra do Agro", participantes: 80, coffeeBreak: true, observacoes: "" };
    expect(aplicarEspaco(pedido, { ...base, periodo: "tarde", inicio: "", fim: "" })).toMatchObject({ ...base, periodo: "tarde", inicio: "13:00", fim: "18:00" });
    expect(aplicarEspaco(pedido, { ...base, periodo: "horario", inicio: "14:00", fim: "16:30" })).toMatchObject({ periodo: "horario", inicio: "14:00", fim: "16:30" });
  });

  it("interpretar envia tipo, texto, hoje e opções; traduz os erros", async () => {
    const respostas = [
      new Response(JSON.stringify({ tipo: "evento", campos: { titulo: "X" }, faltando: ["data"] }), { status: 200 }),
      new Response(JSON.stringify({ motivo: "sem_chave" }), { status: 503 }),
      new Response("{}", { status: 422 }),
      new Response("{}", { status: 429 }),
    ];
    const buscar = vi.fn(async () => respostas.shift()!);
    vi.stubGlobal("fetch", buscar);
    expect(await interpretar("evento", "reunião amanhã", "2026-10-17")).toEqual({ tipo: "ok", campos: { titulo: "X" }, faltando: ["data"] });
    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/sistema\/interpretar$/);
    expect(JSON.parse(String(init.body))).toEqual({ tipo: "evento", texto: "reunião amanhã", hoje: "2026-10-17" });
    expect(await interpretar("evento", "x", "2026-10-17")).toMatchObject({ tipo: "erro", mensagem: expect.stringContaining("desligada") });
    expect(await interpretar("evento", "x", "2026-10-17")).toMatchObject({ mensagem: expect.stringContaining("Não consegui entender") });
    expect(await interpretar("evento", "x", "2026-10-17")).toMatchObject({ mensagem: expect.stringContaining("Muitos pedidos") });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("rede"))));
    expect(await interpretar("evento", "x", "2026-10-17")).toMatchObject({ mensagem: expect.stringContaining("Sem conexão") });
  });
});
