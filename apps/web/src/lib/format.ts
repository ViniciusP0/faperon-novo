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

// --- Valores por extenso (sem siglas): 1.000 = mil, 1.000.000 = milhão, 1.000.000.000 = bilhão ---------------------------

const arred1 = (n: number) => Math.round(n * 10) / 10;

/** Escolhe a escala em que o número arredondado tem menos de 4 dígitos inteiros; o arredondamento nunca escreve "1.000 mil". */
function emEscala(a: number): { numero: string; escala: "" | "mil" | "milhão" | "milhões" | "bilhão" | "bilhões" } {
  if (Math.round(a) < 1000) return { numero: nf0.format(Math.round(a)), escala: "" };
  const escalas = [
    { div: 1e3, singular: "mil", plural: "mil" },
    { div: 1e6, singular: "milhão", plural: "milhões" },
    { div: 1e9, singular: "bilhão", plural: "bilhões" },
  ] as const;
  const e = escalas.find((x) => arred1(a / x.div) < 1000) ?? escalas[2];
  const v = arred1(a / e.div);
  return { numero: nf1.format(v), escala: v < 2 ? e.singular : e.plural };
}

/** `milReais` em mil R$ (como o IBGE publica): "R$ 1,1 bilhão", "R$ 44,9 milhões", "R$ 850 mil", "R$ 500". */
export function formatReaisPorExtenso(milReais: number): string {
  if (milReais === 0) return "R$ 0";
  const { numero, escala } = emEscala(Math.abs(milReais) * 1000);
  return `${milReais < 0 ? "-" : ""}R$ ${numero}${escala ? ` ${escala}` : ""}`;
}

/** O valor completo em reais, sem arredondar: 1.112.550 mil R$ → "R$ 1.112.550.000". */
export function formatReais(milReais: number): string {
  return `${milReais < 0 ? "-" : ""}R$ ${nf0.format(Math.abs(milReais) * 1000)}`;
}

/** "1,4 milhão de hectares", "12,3 mil hectares", "850 hectares", "1 hectare". */
export function formatQuantidadePorExtenso(n: number, unidade: { singular: string; plural: string }): string {
  const { numero, escala } = emEscala(Math.abs(n));
  const sinal = n < 0 ? "-" : "";
  if (!escala) return `${sinal}${numero} ${Math.abs(n) === 1 ? unidade.singular : unidade.plural}`;
  const de = escala === "mil" ? "" : "de ";
  return `${sinal}${numero} ${escala} ${de}${unidade.plural}`;
}

export interface FormatoUnidade {
  /** O valor por extenso, para o balão do mapa e do gráfico. */
  valor: (v: number) => string;
  /** O número do eixo, já na escala de `nomeEixo`. */
  eixo: (v: number) => string;
  /** O título do eixo: "R$ bilhões", "milhões de hectares"… */
  nomeEixo: string;
}

/** O mesmo vocabulário para o mapa e para o gráfico ao lado. `max` escolhe a escala do eixo. Unidade desconhecida → null. */
export function formatoPorUnidade(unidade: string, max: number): FormatoUnidade | null {
  const eixoEm = (div: number) => (v: number) => nf1.format(v / div);
  if (unidade === "Mil Reais") {
    const real = Math.abs(max) * 1000;
    const [div, nomeEixo] = real >= 1e9 ? [1e6, "R$ bilhões"] : real >= 1e6 ? [1e3, "R$ milhões"] : [1, "R$ mil"];
    return { valor: formatReaisPorExtenso, eixo: eixoEm(div), nomeEixo };
  }
  const unidades: Record<string, { singular: string; plural: string }> = {
    Hectares: { singular: "hectare", plural: "hectares" },
    Cabeças: { singular: "cabeça", plural: "cabeças" },
  };
  const u = unidades[unidade];
  if (!u) return null;
  const a = Math.abs(max);
  const [div, nomeEixo] = a >= 1e6 ? [1e6, `milhões de ${u.plural}`] : a >= 1e3 ? [1e3, `mil ${u.plural}`] : [1, u.plural];
  return { valor: (v) => formatQuantidadePorExtenso(v, u), eixo: eixoEm(div), nomeEixo };
}
