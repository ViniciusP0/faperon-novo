/** O visitante pediu menos movimento no sistema operacional. */
export function reducaoDeMovimento(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function temObserver(): boolean {
  return typeof IntersectionObserver !== "undefined";
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface LeituraNumero {
  prefixo: string;
  alvo: number;
  casas: number;
  sufixo: string;
}

/** Separa um número já formatado em pt-BR ("3,4 mi", "1.234", "+12,5%") em prefixo, valor, casas decimais e sufixo. */
export function lerNumeroPtBr(texto: string): LeituraNumero | null {
  const m = /^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(.*)$/s.exec(texto);
  if (!m) return null;
  const inteiro = m[2]!.replaceAll(".", "");
  const decimais = m[3] ?? "";
  return { prefixo: m[1]!, alvo: Number(`${inteiro}.${decimais || "0"}`), casas: decimais.length, sufixo: m[4]! };
}

/** `progresso` vai de 0 a 1; o resultado mantém prefixo, sufixo e número de casas do original. */
export function formatarNumeroPtBr(leitura: LeituraNumero, progresso: number): string {
  const numero = (leitura.alvo * progresso).toLocaleString("pt-BR", {
    minimumFractionDigits: leitura.casas,
    maximumFractionDigits: leitura.casas,
  });
  return `${leitura.prefixo}${numero}${leitura.sufixo}`;
}

/** Script inline do <head>: só com JS a revelação ao rolar esconde conteúdo; sem JS a página aparece inteira. */
export const SCRIPT_JS_OK = `document.documentElement.classList.add("js-ok")`;
