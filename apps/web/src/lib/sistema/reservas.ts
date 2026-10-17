import { sobrepoe } from "./datas";
import type { Manutencao, Reserva, SituacaoVeiculo, Veiculo } from "./tipos";

const ativa = (r: Reserva) => r.situacao === "agendada" || r.situacao === "em_uso";

/** Manutenção em aberto tira o veículo de circulação a partir da data dela, sem fim previsto. */
function manutencaoAberta(veiculoId: string, manutencoes: Manutencao[], ate: string): boolean {
  return manutencoes.some((m) => m.veiculoId === veiculoId && !m.concluida && m.data <= ate.slice(0, 10));
}

export function conflitoDeReserva(
  nova: Reserva,
  reservas: Reserva[],
  manutencoes: Manutencao[],
): "choque" | "manutencao" | null {
  if (manutencaoAberta(nova.veiculoId, manutencoes, nova.retorno)) return "manutencao";
  const choque = reservas.some(
    (r) => r.id !== nova.id && r.veiculoId === nova.veiculoId && ativa(r) && sobrepoe(nova.saida, nova.retorno, r.saida, r.retorno),
  );
  return choque ? "choque" : null;
}

export function situacaoDoVeiculo(
  veiculo: Veiculo,
  reservas: Reserva[],
  manutencoes: Manutencao[],
  agora: string,
): SituacaoVeiculo {
  if (manutencaoAberta(veiculo.id, manutencoes, agora)) return "em_manutencao";
  const doVeiculo = reservas.filter((r) => r.veiculoId === veiculo.id);
  if (doVeiculo.some((r) => r.situacao === "em_uso")) return "reservado";
  if (doVeiculo.some((r) => r.situacao === "agendada" && r.saida <= agora && agora < r.retorno)) return "reservado";
  return "disponivel";
}

export function validarRetorno(kmInicial: number, kmFinal: number): string | null {
  return kmFinal < kmInicial ? "O km de retorno não pode ser menor que o de saída." : null;
}

export const MENSAGEM_CONFLITO: Record<"choque" | "manutencao", string> = {
  choque: "Este veículo já está reservado em parte desse período.",
  manutencao: "Este veículo está em manutenção nesse período.",
};
