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
