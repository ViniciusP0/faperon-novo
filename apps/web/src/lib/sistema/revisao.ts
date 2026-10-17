import { diasEntre, somarMeses } from "./datas";
import type { Manutencao, Veiculo } from "./tipos";

/** Revisão a cada 10.000 km ou 12 meses, o que vencer primeiro. */
export const INTERVALO_KM = 10_000;
export const INTERVALO_MESES = 12;
const AVISO_KM = 1_000;
const AVISO_DIAS = 30;

export interface AlertaRevisao {
  estado: "ok" | "proxima" | "vencida";
  proximaKm: number;
  proximaData: string | null;
}

export function alertaDeRevisao(veiculo: Veiculo, manutencoes: Manutencao[], hoje: string): AlertaRevisao {
  const ultima = manutencoes
    .filter((m) => m.veiculoId === veiculo.id && m.tipo === "revisao" && m.concluida)
    .sort((a, b) => a.data.localeCompare(b.data))
    .at(-1);
  const proximaKm = (ultima?.km ?? 0) + INTERVALO_KM;
  const proximaData = ultima ? somarMeses(ultima.data, INTERVALO_MESES) : null;
  const faltamKm = proximaKm - veiculo.km;
  const faltamDias = proximaData ? diasEntre(hoje, proximaData) : Number.POSITIVE_INFINITY;
  const estado = faltamKm <= 0 || faltamDias <= 0 ? "vencida" : faltamKm <= AVISO_KM || faltamDias <= AVISO_DIAS ? "proxima" : "ok";
  return { estado, proximaKm, proximaData };
}
