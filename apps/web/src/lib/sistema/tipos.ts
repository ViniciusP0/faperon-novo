/** Tipos do protótipo do sistema interno (agenda e frotas). Datas são strings locais, sem fuso:
 *  `YYYY-MM-DD` para dias e `YYYY-MM-DDTHH:mm` para momentos; comparam bem como texto. */

export interface Funcionario {
  id: string;
  nome: string;
  area: string;
  gestorFrota: boolean;
}

export type TipoEvento = "reuniao" | "viagem" | "compromisso";
export type OrigemEvento = "pessoal" | "faperon" | "frota";

export interface Evento {
  id: string;
  titulo: string;
  data: string;
  inicio: string;
  fim: string;
  local: string;
  descricao: string;
  tipo: TipoEvento;
  origem: OrigemEvento;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  ano: number;
  km: number;
}

export type SituacaoReserva = "agendada" | "em_uso" | "concluida" | "cancelada";

export interface Reserva {
  id: string;
  veiculoId: string;
  funcionarioId: string;
  saida: string;
  retorno: string;
  destino: string;
  motivo: string;
  kmInicial: number | null;
  kmFinal: number | null;
  situacao: SituacaoReserva;
}

export interface Abastecimento {
  id: string;
  veiculoId: string;
  funcionarioId: string;
  data: string;
  litros: number;
  valor: number;
  km: number;
}

export type TipoManutencao = "revisao" | "pneus" | "freios" | "outros";

export interface Manutencao {
  id: string;
  veiculoId: string;
  data: string;
  tipo: TipoManutencao;
  valor: number;
  km: number;
  concluida: boolean;
}

export interface EstadoFrota {
  veiculos: Veiculo[];
  reservas: Reserva[];
  abastecimentos: Abastecimento[];
  manutencoes: Manutencao[];
}

export type SituacaoVeiculo = "disponivel" | "reservado" | "em_manutencao";
