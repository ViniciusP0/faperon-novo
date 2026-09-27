import type { Ponto } from "./api-types";
import { formatNumero } from "./format";

export interface Tendencia {
  /** Variação média da série por ano, na unidade do indicador. */
  inclinacao: number;
  intercepto: number;
  anoBase: number;
  /** Valor da reta em cada ponto da série, alinhado com `pontos`. */
  valores: number[];
  /** Quanto da variação da série a reta explica (0 a 1). */
  r2: number;
}

/**
 * Regressão linear por mínimos quadrados sobre os anos com valor publicado.
 * Anos sigilosos ou sem dado ficam fora do ajuste (nunca entram como zero) e o eixo x é o ano real.
 */
export function tendenciaLinear(pontos: Ponto[]): Tendencia | null {
  const validos = pontos.filter((p): p is Ponto & { valor: number } => p.valor !== null);
  if (validos.length < 2) return null;

  const anoBase = validos[0]!.ano;
  const n = validos.length;
  const xs = validos.map((p) => p.ano - anoBase);
  const ys = validos.map((p) => p.valor);
  const mediaX = xs.reduce((a, b) => a + b, 0) / n;
  const mediaY = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mediaX) * (ys[i]! - mediaY);
    sxx += (xs[i]! - mediaX) ** 2;
  }
  if (sxx === 0) return null;

  const inclinacao = sxy / sxx;
  const intercepto = mediaY - inclinacao * mediaX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i]! - (inclinacao * xs[i]! + intercepto)) ** 2;
    ssTot += (ys[i]! - mediaY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { inclinacao, intercepto, anoBase, valores: pontos.map((p) => inclinacao * (p.ano - anoBase) + intercepto), r2 };
}

/** A reta como série de pontos (um por ano do período), para gráfico e tabela alternativa. */
export function pontosDaTendencia(pontos: Ponto[], t: Tendencia): Ponto[] {
  return pontos.map((p, i) => ({ ano: p.ano, valor: t.valores[i]!, status: "ok" }));
}

export function descreverTendencia(t: Tendencia, unidade: string): string {
  const un = unidade.toLowerCase();
  const r2 = t.r2.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prefixo = "Linha de tendência (regressão linear pelos anos com dado):";
  if (Math.abs(t.inclinacao) < 1e-9) return `${prefixo} estável, sem variação média por ano (R² = ${r2}).`;
  const sinal = t.inclinacao > 0 ? "+" : "−";
  const tipo = t.inclinacao > 0 ? "crescimento médio" : "queda média";
  return `${prefixo} ${tipo} de ${sinal}${formatNumero(Math.abs(t.inclinacao))} ${un} por ano (R² = ${r2}).`;
}
