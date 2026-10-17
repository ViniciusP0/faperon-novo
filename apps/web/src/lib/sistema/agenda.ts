import { ESPACOS } from "@/content/sistema/exemplo";
import { formatarHora } from "./datas";
import { formatarPlaca } from "./placa";
import type { Evento, PedidoEspaco, Reserva, TipoEvento, Veiculo } from "./tipos";

export const ROTULO_TIPO_EVENTO: Record<TipoEvento, string> = {
  reuniao: "Reunião",
  viagem: "Viagem",
  compromisso: "Compromisso",
};

export const ROTULO_ORIGEM: Record<Evento["origem"], string | null> = {
  pessoal: null,
  faperon: "FAPERON",
  frota: "Frota",
  espaco: "Espaço",
};

/** Agenda da pessoa: eventos próprios, institucionais, viagens reservadas e espaços aprovados, em ordem. */
export function itensDaAgenda(
  funcionarioId: string,
  pessoais: Evento[],
  institucionais: Evento[],
  reservas: Reserva[],
  veiculos: Veiculo[],
  pedidos: PedidoEspaco[],
): Evento[] {
  const viagens: Evento[] = reservas
    .filter((r) => r.funcionarioId === funcionarioId && r.situacao !== "cancelada")
    .map((r) => {
      const veiculo = veiculos.find((v) => v.id === r.veiculoId);
      const mesmoDia = r.saida.slice(0, 10) === r.retorno.slice(0, 10);
      return {
        id: `frota-${r.id}`,
        titulo: `Viagem a ${r.destino}`,
        data: r.saida.slice(0, 10),
        inicio: formatarHora(r.saida),
        fim: mesmoDia ? formatarHora(r.retorno) : "23:59",
        local: veiculo ? `${veiculo.modelo} (${formatarPlaca(veiculo.placa)})` : "",
        descricao: r.motivo,
        tipo: "viagem",
        origem: "frota",
      };
    });
  const espacos: Evento[] = pedidos
    .filter((p) => p.funcionarioId === funcionarioId && p.status === "aprovado")
    .map((p) => ({
      id: `espaco-${p.id}`,
      titulo: p.nome,
      data: p.data,
      inicio: p.inicio,
      fim: p.fim,
      local: ESPACOS.find((e) => e.id === p.espacoId)?.nome ?? "",
      descricao: "",
      tipo: "reuniao",
      origem: "espaco",
    }));
  return [...pessoais, ...institucionais, ...viagens, ...espacos].sort(
    (a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio) || a.titulo.localeCompare(b.titulo),
  );
}

export function validarEvento(e: Pick<Evento, "titulo" | "data" | "inicio" | "fim">): string | null {
  if (!e.titulo.trim()) return "Informe o título do evento.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.data)) return "Informe a data do evento.";
  if (!e.inicio || !e.fim) return "Informe o horário de início e de fim.";
  if (e.fim <= e.inicio) return "O fim precisa ser depois do início.";
  return null;
}
