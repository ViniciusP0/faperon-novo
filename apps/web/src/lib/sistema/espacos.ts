import { sobrepoe } from "./datas";
import type { Espaco, PedidoEspaco, PeriodoEspaco, StatusPedido, TipoEventoEspaco } from "./tipos";

export const PERIODOS: Record<Exclude<PeriodoEspaco, "horario">, { inicio: string; fim: string; rotulo: string }> = {
  dia_todo: { inicio: "08:00", fim: "18:00", rotulo: "Dia todo (8h às 18h)" },
  manha: { inicio: "08:00", fim: "12:00", rotulo: "Manhã (8h às 12h)" },
  tarde: { inicio: "13:00", fim: "18:00", rotulo: "Tarde (13h às 18h)" },
  noite: { inicio: "18:00", fim: "22:00", rotulo: "Noite (18h às 22h)" },
};

export const ROTULO_PERIODO: Record<PeriodoEspaco, string> = {
  ...Object.fromEntries(Object.entries(PERIODOS).map(([k, v]) => [k, v.rotulo])),
  horario: "Horário específico",
} as Record<PeriodoEspaco, string>;

export const ROTULO_TIPO_ESPACO: Record<TipoEventoEspaco, string> = {
  reuniao: "Reunião",
  curso: "Curso ou treinamento",
  palestra: "Palestra",
  institucional: "Evento institucional",
  outro: "Outro",
};

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
  devolvido: "Devolvido para correção",
};

/** Período fixo vira horário; "horario" exige início e fim válidos (fim depois do início). */
export function horarioDoPeriodo(periodo: PeriodoEspaco, inicio = "", fim = ""): { inicio: string; fim: string } | null {
  if (periodo !== "horario") return { inicio: PERIODOS[periodo].inicio, fim: PERIODOS[periodo].fim };
  const valido = /^\d{2}:\d{2}$/;
  if (!valido.test(inicio) || !valido.test(fim) || fim <= inicio) return null;
  return { inicio, fim };
}

/** Pendentes também contam: o pedido entra na fila sinalizado, e o gestor decide. */
const ocupa = (p: PedidoEspaco) => p.status === "pendente" || p.status === "aprovado";

export function conflitosDoPedido(pedido: PedidoEspaco, pedidos: PedidoEspaco[]): PedidoEspaco[] {
  return pedidos.filter(
    (p) =>
      p.id !== pedido.id &&
      ocupa(p) &&
      p.espacoId === pedido.espacoId &&
      p.data === pedido.data &&
      sobrepoe(pedido.inicio, pedido.fim, p.inicio, p.fim),
  );
}

export function excedeCapacidade(pedido: PedidoEspaco, espaco: Espaco): boolean {
  return pedido.participantes > espaco.capacidade;
}

export function podeAprovar(pedido: PedidoEspaco, pedidos: PedidoEspaco[]): string | null {
  const aprovado = conflitosDoPedido(pedido, pedidos).find((p) => p.status === "aprovado");
  return aprovado
    ? `Já há um agendamento aprovado nesse espaço e horário: ${aprovado.nome} (${aprovado.inicio}–${aprovado.fim}).`
    : null;
}

/** Texto inicial da devolução: os choques de horário e o excesso de participantes, para o gestor ajustar. */
export function sugestaoDeCorrecao(pedido: PedidoEspaco, pedidos: PedidoEspaco[], espaco: Espaco): string {
  const partes = conflitosDoPedido(pedido, pedidos).map(
    (c) => `Conflita com "${c.nome}" (${c.inicio}–${c.fim}, ${c.status === "aprovado" ? "já aprovado" : "pendente"}).`,
  );
  if (excedeCapacidade(pedido, espaco)) partes.push(`${pedido.participantes} participantes passam da capacidade de ${espaco.capacidade} do espaço.`);
  if (partes.length === 0) return "";
  return `${partes.join(" ")} Escolha outro horário, dia ou espaço e reenvie.`;
}
