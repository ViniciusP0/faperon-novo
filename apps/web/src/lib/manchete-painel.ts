import type { StatusValor } from "./api-types";
import { formatNumero } from "./format";
import type { ParteManchete } from "./destaques";

const NBSP = " ";
const nfExtenso = new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "long", maximumFractionDigits: 1 });

export interface Medida {
  /** Número já legível: "1,2 milhão", "3.504" ou "R$ 1,2 bilhão". */
  numero: string;
  /** Unidade em minúsculas; vazia para valores em reais. */
  unidade: string;
  /** Número + unidade em uma expressão ("1,2 milhão de toneladas"). */
  texto: string;
}

const REAIS_POR_MIL = "mil reais";
const LITROS_POR_MIL = "mil litros";

/** Escreve um valor do IBGE por extenso para leitura rápida: milhões e bilhões por palavra, mil reais como reais. */
export function medida(valor: number, unidadeApi: string): Medida {
  const chave = unidadeApi.trim().toLowerCase();
  let v = valor;
  let unidade = chave;
  let moeda = false;
  if (chave === REAIS_POR_MIL) {
    v = valor * 1000;
    unidade = "";
    moeda = true;
  } else if (chave === LITROS_POR_MIL) {
    v = valor * 1000;
    unidade = "litros";
  }

  const extenso = Math.abs(v) >= 10000 ? nfExtenso.format(v) : formatNumero(v);
  const numero = (moeda ? `R$${NBSP}${extenso}` : extenso).replace(/ /g, NBSP);
  const usaDe = /(milhão|milhões|bilhão|bilhões|trilhão|trilhões)$/.test(extenso);
  const texto = unidade ? `${numero}${NBSP}${usaDe ? "de " : ""}${unidade}` : numero;
  return { numero, unidade, texto };
}

interface EntradaManchete {
  produto: string;
  indicadorSlug: string;
  indicadorNome: string;
  unidade: string;
  valor: number | null;
  status?: StatusValor;
  ano: number;
  /** Nome do município; ausente = Rondônia. */
  territorio?: string;
}

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Frase de abertura do painel, no estilo da manchete da home. Devolve null enquanto não há valor publicado. */
export function manchetePainel(e: EntradaManchete): ParteManchete[] | null {
  if (e.valor === null) return null;
  const onde = e.territorio ?? "Rondônia";
  const m = medida(e.valor, e.unidade);
  const em = `Em ${e.ano}, `;
  const destaque = (texto: string): ParteManchete => ({ texto, destaque: true });
  const normal = (texto: string): ParteManchete => ({ texto, destaque: false });
  const produto = minuscula(e.produto);

  switch (e.indicadorSlug) {
    case "quantidade-produzida":
    case "producao-de-origem-animal":
      return [normal(`${em}${onde} produziu `), destaque(m.texto), normal(` de ${produto}.`)];
    case "area-plantada":
      return [normal(`${em}${onde} plantou `), destaque(m.texto), normal(` de ${produto}.`)];
    case "area-colhida":
      return [normal(`${em}${onde} colheu `), destaque(m.texto), normal(` de ${produto}.`)];
    case "efetivo":
      return [normal(`${em}${onde} tinha `), destaque(m.texto), normal(` no rebanho de ${produto}.`)];
    case "valor-da-producao":
      return [normal(`${em}${produto} gerou `), destaque(m.texto), normal(` em ${onde}.`)];
    default:
      return [normal(`${e.indicadorNome} de ${produto} em ${onde}, ${e.ano}: `), destaque(m.texto), normal(".")];
  }
}
