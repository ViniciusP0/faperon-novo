import { describe, expect, it } from "vitest";
import { conflitosDoPedido, excedeCapacidade, horarioDoPeriodo, podeAprovar, sugestaoDeCorrecao } from "./espacos";
import type { Espaco, PedidoEspaco } from "./tipos";

function pedido(parcial: Partial<PedidoEspaco>): PedidoEspaco {
  return {
    id: "p",
    espacoId: "auditorio",
    funcionarioId: "f1",
    data: "2026-10-20",
    periodo: "manha",
    inicio: "08:00",
    fim: "12:00",
    tipo: "reuniao",
    nome: "Reunião",
    participantes: 10,
    coffeeBreak: false,
    observacoes: "",
    status: "pendente",
    motivoRecusa: "",
    criadoEm: "2026-10-17T10:00",
    ...parcial,
  };
}

describe("horário do período", () => {
  it.each([
    ["dia_todo", "08:00", "18:00"],
    ["manha", "08:00", "12:00"],
    ["tarde", "13:00", "18:00"],
    ["noite", "18:00", "22:00"],
  ] as const)("%s vai de %s a %s", (periodo, inicio, fim) => {
    expect(horarioDoPeriodo(periodo)).toEqual({ inicio, fim });
  });

  it("horário específico precisa de fim depois do início", () => {
    expect(horarioDoPeriodo("horario", "09:30", "11:00")).toEqual({ inicio: "09:30", fim: "11:00" });
    expect(horarioDoPeriodo("horario", "11:00", "11:00")).toBeNull();
    expect(horarioDoPeriodo("horario", "", "11:00")).toBeNull();
  });
});

describe("conflitos de espaço", () => {
  const outros = [
    pedido({ id: "a", status: "aprovado", inicio: "10:00", fim: "12:00", periodo: "horario" }),
    pedido({ id: "b", status: "pendente", periodo: "tarde", inicio: "13:00", fim: "18:00" }),
    pedido({ id: "c", status: "recusado" }),
    pedido({ id: "d", status: "cancelado" }),
    pedido({ id: "e", espacoId: "hub" }),
    pedido({ id: "f", data: "2026-10-21" }),
  ];

  it("conta aprovado e pendente do mesmo espaço e dia com horário sobreposto", () => {
    expect(conflitosDoPedido(pedido({ id: "novo", periodo: "dia_todo", inicio: "08:00", fim: "18:00" }), outros).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("encostar não é conflito; recusado, cancelado, outro espaço e outro dia não contam", () => {
    expect(conflitosDoPedido(pedido({ id: "novo", periodo: "horario", inicio: "12:00", fim: "13:00" }), outros)).toEqual([]);
  });

  it("um pedido não conflita consigo mesmo", () => {
    expect(conflitosDoPedido(outros[0]!, outros).map((p) => p.id)).toEqual([]);
  });

  it("lotação acima da capacidade", () => {
    const sala: Espaco = { id: "sala-reunioes", nome: "Sala de reuniões", capacidade: 12 };
    expect(excedeCapacidade(pedido({ participantes: 13 }), sala)).toBe(true);
    expect(excedeCapacidade(pedido({ participantes: 12 }), sala)).toBe(false);
  });

  it("aprovação bloqueada só por conflito com outro aprovado", () => {
    const pendenteComAprovado = pedido({ id: "novo", periodo: "dia_todo", inicio: "08:00", fim: "18:00" });
    expect(podeAprovar(pendenteComAprovado, outros)).toBe("Já há um agendamento aprovado nesse espaço e horário: Reunião (10:00–12:00).");
    expect(podeAprovar(pedido({ id: "novo", periodo: "tarde", inicio: "13:00", fim: "18:00" }), outros)).toBeNull();
  });
});

describe("devolução para correção", () => {
  const auditorio: Espaco = { id: "auditorio", nome: "Auditório", capacidade: 150 };

  it("sugere o que corrigir: choques de horário e capacidade", () => {
    const outro = pedido({ id: "o", nome: "Palestra do crédito", status: "aprovado", inicio: "10:00", fim: "11:00" });
    const meu = pedido({ id: "m", participantes: 200 });
    expect(sugestaoDeCorrecao(meu, [outro, meu], auditorio)).toBe(
      'Conflita com "Palestra do crédito" (10:00–11:00, já aprovado). 200 participantes passam da capacidade de 150 do espaço. Escolha outro horário, dia ou espaço e reenvie.',
    );
    expect(sugestaoDeCorrecao(pedido({ id: "s" }), [], auditorio)).toBe("");
  });

  it("pedido devolvido não ocupa o espaço", () => {
    const devolvido = pedido({ id: "d", status: "devolvido" });
    expect(conflitosDoPedido(pedido({ id: "n" }), [devolvido])).toEqual([]);
  });
});
