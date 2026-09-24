import type { Destaque } from "./api-types";
import { serializeFiltros } from "./filters";
import { formatCompacto } from "./format";

const CONVERSOES: Record<string, { unidade: string; fator: number }> = {
  "Mil litros": { unidade: "Litros", fator: 1000 },
};

/** O IBGE publica o leite em mil litros; a home mostra em litros. */
export function normalizarDestaque(d: Destaque): Destaque {
  const conversao = CONVERSOES[d.indicador.unidade];
  if (!conversao) return d;
  const escala = (v: number | null) => (v === null ? null : v * conversao.fator);
  return {
    ...d,
    indicador: { ...d.indicador, unidade: conversao.unidade },
    total: escala(d.total),
    serie: d.serie.map((p) => ({ ...p, valor: escala(p.valor) })),
    top: d.top.map((t) => ({ ...t, valor: escala(t.valor) })),
  };
}

export interface ParteManchete {
  texto: string;
  destaque: boolean;
}

const NBSP = " ";
const compacto = (v: number) => formatCompacto(v).replace(/\s/g, NBSP);

const FRASES = [
  { chave: "soja", antes: "colheu ", objeto: "soja" },
  { chave: "leite", antes: "produziu ", objeto: "leite" },
  { chave: "bovino", antes: "chegou a ", objeto: "gado" },
] as const;

/** Frase de abertura da home com os números do IBGE; null se algum indicador faltar. */
export function manchete(itens: Destaque[]): ParteManchete[] | null {
  const por = new Map(itens.map((i) => [i.chave, i]));
  const encontrados = FRASES.map((f) => ({ f, d: por.get(f.chave) }));
  if (encontrados.some(({ d }) => !d || d.total === null)) return null;
  const anoBase = por.get("soja")!.ano_referencia;

  const partes: ParteManchete[] = [{ texto: `Em ${anoBase}, Rondônia `, destaque: false }];
  encontrados.forEach(({ f, d }, i) => {
    const item = d!;
    const numero = `${compacto(item.total!)}${NBSP}de ${item.indicador.unidade.toLowerCase()} de ${f.objeto}`;
    const ano = item.ano_referencia !== anoBase ? ` (${item.ano_referencia})` : "";
    const fim = i === FRASES.length - 1 ? "." : i === FRASES.length - 2 ? " e " : ", ";
    partes.push({ texto: f.antes, destaque: false }, { texto: numero, destaque: true }, { texto: ano + fim, destaque: false });
  });
  return partes;
}

function primeiroAno(d: Destaque): number | null {
  return d.serie.find((p) => p.valor !== null)?.ano ?? null;
}

export function textoVariacao(d: Destaque): string {
  const ano = primeiroAno(d);
  if (d.variacao_percentual === null || ano === null) return "Sem série para comparar";
  const arredondado = Math.round(d.variacao_percentual);
  const sinal = arredondado < 0 ? "−" : "+";
  return `${sinal}${Math.abs(arredondado).toLocaleString("pt-BR")}% desde ${ano}`;
}

export function linkPainel(d: Destaque): string {
  const params = serializeFiltros({ segmento: d.produto.segmento, produto: d.produto.slug, indicador: d.indicador.slug });
  return `/painel?${params.toString()}`;
}

export function descreverDestaque(d: Destaque): string {
  const validos = d.serie.filter((p) => p.valor !== null);
  const intervalo = validos.length ? `de ${validos[0]!.ano} a ${validos[validos.length - 1]!.ano}` : "sem dados";
  const total = d.total === null ? "sem total" : `${compacto(d.total)} ${d.indicador.unidade.toLowerCase()} em ${d.ano_referencia}`;
  return `${d.rotulo}: ${total}. Série anual ${intervalo}. ${textoVariacao(d)}.`;
}
