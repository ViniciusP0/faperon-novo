import type { Abastecimento, Manutencao, Reserva } from "./tipos";

export interface CustoDoMes {
  mes: string;
  combustivel: number;
  manutencao: number;
  total: number;
  km: number;
  custoPorKm: number | null;
}

const arredondar = (v: number) => Math.round(v * 100) / 100;

function mesesAte(ultimo: string, quantos: number): string[] {
  const [ano, mes] = ultimo.split("-").map(Number);
  return Array.from({ length: quantos }, (_, i) => {
    const d = new Date(ano!, mes! - 1 - (quantos - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

/** Custos dos últimos `quantos` meses até `ultimoMes` (YYYY-MM); veiculoId null soma a frota. */
export function custosPorMes(
  abastecimentos: Abastecimento[],
  manutencoes: Manutencao[],
  reservas: Reserva[],
  veiculoId: string | null,
  ultimoMes: string,
  quantos = 6,
): CustoDoMes[] {
  const doVeiculo = <T extends { veiculoId: string }>(item: T) => veiculoId == null || item.veiculoId === veiculoId;
  return mesesAte(ultimoMes, quantos).map((mes) => {
    const combustivel = abastecimentos.filter((a) => doVeiculo(a) && a.data.startsWith(mes)).reduce((s, a) => s + a.valor, 0);
    const manutencao = manutencoes.filter((m) => doVeiculo(m) && m.data.startsWith(mes)).reduce((s, m) => s + m.valor, 0);
    const km = reservas
      .filter((r) => doVeiculo(r) && r.situacao === "concluida" && r.retorno.startsWith(mes) && r.kmInicial != null && r.kmFinal != null)
      .reduce((s, r) => s + (r.kmFinal! - r.kmInicial!), 0);
    const total = combustivel + manutencao;
    return {
      mes,
      combustivel: arredondar(combustivel),
      manutencao: arredondar(manutencao),
      total: arredondar(total),
      km,
      custoPorKm: km > 0 ? arredondar(total / km) : null,
    };
  });
}
