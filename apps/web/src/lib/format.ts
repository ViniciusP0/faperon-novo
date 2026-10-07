import type { StatusValor } from "./api-types";

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const nfCompact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumero(valor: number): string {
  return Math.abs(valor) >= 1000 || Number.isInteger(valor) ? nf0.format(valor) : nf2.format(valor);
}

export function formatCompacto(valor: number): string {
  return nfCompact.format(valor);
}

export function formatValor(valor: number | null, status: StatusValor = "ok"): string {
  if (valor === null) return status === "sigiloso" ? "X" : "–";
  return formatNumero(valor);
}

export function formatPercentual(valor: number | null, casas = 1): string {
  if (valor === null) return "–";
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function formatDataHora(iso: string | null): string {
  if (!iso) return "não disponível";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "não disponível";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Porto_Velho" });
}

export function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  return new Date(Date.UTC(ano, mes - 1, dia)).toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: "UTC" });
}

export function formatDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  return new Date(Date.UTC(ano, mes - 1, dia)).toLocaleDateString("pt-BR", { dateStyle: "medium", timeZone: "UTC" });
}

const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** `v` em mil R$ (como o IBGE publica): escreve "R$ 14,5 bi", "R$ 850 mi" ou "R$ 12 mil". */
export function formatMilReais(v: number): string {
  if (v === 0) return "R$ 0";
  const sinal = v < 0 ? "-" : "";
  const a = Math.abs(v);
  // 1 mil R$ = 1e3; mi = 1e3 mil; bi = 1e6 mil. O arredondamento pode empurrar para a unidade de cima.
  if (a >= 1e6 || Math.round((a / 1e3) * 10) / 10 >= 1000) return `${sinal}R$ ${nf1.format(a / 1e6)} bi`;
  if (a >= 1e3) return `${sinal}R$ ${nf1.format(a / 1e3)} mi`;
  return `${sinal}R$ ${nf1.format(a)} mil`;
}

/** `v` em mil litros: "583,7 milhões de litros" (singular abaixo de 2). */
export function formatMilLitros(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6 || Math.round((a / 1e3) * 10) / 10 >= 1000) {
    return `${nf1.format(v / 1e6)} ${a / 1e6 < 2 ? "bilhão" : "bilhões"} de litros`;
  }
  if (a >= 1e3) return `${nf1.format(v / 1e3)} ${a / 1e3 < 2 ? "milhão" : "milhões"} de litros`;
  return `${nf1.format(v)} mil litros`;
}

/** Rótulo de eixo em bilhões de reais, para valores em mil R$. */
export function formatBilhoesEixo(v: number): string {
  return nf1.format(v / 1e6);
}
