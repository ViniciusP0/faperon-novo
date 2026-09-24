export type Aba = "ranking" | "serie" | "comparacao" | "analise";
export type ModoComparacao = "municipios" | "produtos";

export interface Filtros {
  segmento: string;
  produto: string;
  indicador: string;
  inicio: number | null;
  fim: number | null;
  aba: Aba;
  municipio: string;
  modo: ModoComparacao;
  municipios: string[];
  produtos: string[];
}

export const ABAS: Aba[] = ["ranking", "serie", "comparacao", "analise"];
export const MAX_COMPARACAO = 5;

const intOrNull = (v: string | null): number | null => {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const lista = (v: string | null): string[] =>
  v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_COMPARACAO)
    : [];

export function parseFiltros(sp: URLSearchParams): Filtros {
  const aba = sp.get("aba");
  return {
    segmento: sp.get("segmento") ?? "",
    produto: sp.get("produto") ?? "",
    indicador: sp.get("indicador") ?? "",
    inicio: intOrNull(sp.get("inicio")),
    fim: intOrNull(sp.get("fim")),
    aba: ABAS.includes(aba as Aba) ? (aba as Aba) : "ranking",
    municipio: sp.get("municipio") ?? "",
    modo: sp.get("modo") === "produtos" ? "produtos" : "municipios",
    municipios: lista(sp.get("municipios")),
    produtos: lista(sp.get("produtos")),
  };
}

export function serializeFiltros(f: Partial<Filtros>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.segmento) p.set("segmento", f.segmento);
  if (f.produto) p.set("produto", f.produto);
  if (f.indicador) p.set("indicador", f.indicador);
  if (f.inicio != null) p.set("inicio", String(f.inicio));
  if (f.fim != null) p.set("fim", String(f.fim));
  if (f.aba && f.aba !== "ranking") p.set("aba", f.aba);
  if (f.municipio) p.set("municipio", f.municipio);
  if (f.modo === "produtos") p.set("modo", "produtos");
  if (f.municipios?.length) p.set("municipios", f.municipios.join(","));
  if (f.produtos?.length) p.set("produtos", f.produtos.join(","));
  return p;
}

/** Parâmetros que definem o recorte (produto + indicador + período). */
export function recorteParams(f: Pick<Filtros, "produto" | "indicador" | "inicio" | "fim">): URLSearchParams {
  const p = new URLSearchParams();
  p.set("produto", f.produto);
  p.set("indicador", f.indicador);
  if (f.inicio != null) p.set("inicio", String(f.inicio));
  if (f.fim != null) p.set("fim", String(f.fim));
  return p;
}

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
