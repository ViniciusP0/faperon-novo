import type { Ponto } from "./api-types";
import { formatNumero, formatPercentual } from "./format";

/** Descrição textual de uma série, usada como alternativa ao gráfico (WCAG 1.1.1). */
export function descreverSerie(nome: string, pontos: Ponto[], unidade: string): string {
  const validos = pontos.filter((p): p is Ponto & { valor: number } => p.valor !== null);
  if (validos.length === 0) return `Não há valores publicados pelo IBGE para ${nome} no período selecionado.`;

  const primeiro = validos[0]!;
  const ultimo = validos[validos.length - 1]!;
  const maior = validos.reduce((a, b) => (b.valor > a.valor ? b : a));
  const menor = validos.reduce((a, b) => (b.valor < a.valor ? b : a));
  const un = unidade.toLowerCase();

  const partes = [
    `${nome}: de ${primeiro.ano} a ${ultimo.ano}, o valor foi de ${formatNumero(primeiro.valor)} para ${formatNumero(ultimo.valor)} ${un}`,
  ];
  if (primeiro.valor > 0 && primeiro.ano !== ultimo.ano) {
    const variacao = (ultimo.valor / primeiro.valor - 1) * 100;
    partes[0] += ` (${variacao >= 0 ? "+" : ""}${formatPercentual(variacao)})`;
  }
  partes.push(`Maior valor em ${maior.ano}: ${formatNumero(maior.valor)}. Menor valor em ${menor.ano}: ${formatNumero(menor.valor)}.`);

  const ausentes = pontos.length - validos.length;
  if (ausentes > 0) partes.push(`${ausentes} ano(s) sem valor publicado ou sigiloso.`);
  return partes.join(". ").replace(/\.\./g, ".");
}

export function descreverComparacao(series: { nome: string; pontos: Ponto[] }[], unidade: string): string {
  return series.map((s) => descreverSerie(s.nome, s.pontos, unidade)).join(" ");
}
