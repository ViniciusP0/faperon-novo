import { ESPACOS } from "@/content/sistema/exemplo";
import { formatarHora, somarDias } from "./datas";
import { TIPO_DO_ESPACO } from "./legenda";
import { formatarPlaca } from "./placa";
import type { Evento, Funcionario, PedidoEspaco, Reserva, TipoEvento, Veiculo } from "./tipos";

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

// Teto de dias por viagem, para uma data de retorno errada não encher a agenda.
const DIAS_MAXIMOS_DA_VIAGEM = 31;

/** Um item por dia da viagem, da saída ao retorno: a ida a partir da saída, o meio o dia todo, a volta até o retorno. */
export function diasDaViagem(r: Reserva, base: Omit<Evento, "id" | "data" | "inicio" | "fim" | "trecho">, prefixoId: string): Evento[] {
  const ida = r.saida.slice(0, 10);
  const volta = r.retorno.slice(0, 10) < ida ? ida : r.retorno.slice(0, 10);
  if (ida === volta) return [{ ...base, id: prefixoId, data: ida, inicio: formatarHora(r.saida), fim: formatarHora(r.retorno), trecho: "unico" }];
  const dias: Evento[] = [];
  for (let dia = ida, n = 0; dia <= volta && n < DIAS_MAXIMOS_DA_VIAGEM; dia = somarDias(dia, 1), n++) {
    const trecho = dia === ida ? "ida" : dia === volta ? "volta" : "meio";
    dias.push({
      ...base,
      id: `${prefixoId}-${dia}`,
      data: dia,
      inicio: trecho === "ida" ? formatarHora(r.saida) : "00:00",
      fim: trecho === "volta" ? formatarHora(r.retorno) : "23:59",
      trecho,
    });
  }
  return dias;
}

/**
 * Agenda da pessoa: eventos próprios, institucionais, viagens reservadas (em todos os dias, da saída ao
 * retorno) e espaços aprovados, em ordem. Com `equipe`, entram também as viagens dos colegas, para todos
 * saberem quem estará fora.
 */
export function itensDaAgenda(
  funcionarioId: string,
  pessoais: Evento[],
  institucionais: Evento[],
  reservas: Reserva[],
  veiculos: Veiculo[],
  pedidos: PedidoEspaco[],
  equipe?: Funcionario[],
): Evento[] {
  const ativas = reservas.filter((r) => r.situacao !== "cancelada");
  const viagens: Evento[] = ativas
    .filter((r) => r.funcionarioId === funcionarioId)
    .flatMap((r) => {
      const veiculo = veiculos.find((v) => v.id === r.veiculoId);
      return diasDaViagem(
        r,
        {
          titulo: `Viagem a ${r.destino}`,
          local: veiculo ? `${veiculo.modelo} (${formatarPlaca(veiculo.placa)})` : "",
          descricao: r.motivo,
          tipo: "viagem",
          origem: "frota",
          destino: r.destino,
          tags: r.tags,
        },
        `frota-${r.id}`,
      );
    });
  const dosColegas: Evento[] = equipe
    ? ativas
        // dos colegas, só o que ainda vai acontecer ou está em curso: quem estará fora, não o histórico
        .filter((r) => r.funcionarioId !== funcionarioId && r.situacao !== "concluida")
        .flatMap((r) => {
          const nome = equipe.find((f) => f.id === r.funcionarioId)?.nome;
          if (!nome) return [];
          const quem = nome.split(" ")[0]!;
          return diasDaViagem(
            r,
            { titulo: `${nome} em viagem a ${r.destino}`, local: "", descricao: "", tipo: "viagem", origem: "frota", destino: r.destino, quem, tags: r.tags },
            `equipe-${r.id}`,
          );
        })
    : [];
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
      tipoNaLegenda: TIPO_DO_ESPACO[p.tipo],
      origem: "espaco",
      tags: p.tags,
    }));
  return [...pessoais, ...institucionais, ...viagens, ...dosColegas, ...espacos].sort(
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
