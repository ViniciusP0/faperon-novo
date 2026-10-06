import type { Noticia } from "@/content/noticias";

export const POR_PAGINA = 12;

export interface OpcaoCategoria {
  /** Forma usada na URL: minúsculas, sem acento e com hífen. */
  slug: string;
  nome: string;
  total: number;
}

/** Como o Next entrega um parâmetro da URL: um valor, vários (?a=1&a=2) ou nenhum. */
type ParametroUrl = string | string[] | undefined;

export interface ParametrosLista {
  categoria?: ParametroUrl;
  pagina?: ParametroUrl;
}

export interface ResultadoLista {
  itens: Noticia[];
  total: number;
  pagina: number;
  totalPaginas: number;
  categoria: OpcaoCategoria | null;
}

export function slugCategoria(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Categorias presentes nos dados, em ordem alfabética, com a contagem de notícias de cada uma. */
export function categoriasDisponiveis(noticias: Noticia[]): OpcaoCategoria[] {
  const porSlug = new Map<string, OpcaoCategoria>();
  for (const noticia of noticias) {
    for (const nome of noticia.categorias) {
      const slug = slugCategoria(nome);
      const atual = porSlug.get(slug);
      if (atual) atual.total += 1;
      else porSlug.set(slug, { slug, nome, total: 1 });
    }
  }
  return [...porSlug.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

const primeiro = (valor: ParametroUrl): string | undefined => (Array.isArray(valor) ? valor[0] : valor);

/** Filtra e pagina. Parâmetros inválidos nunca falham: categoria desconhecida vira Todas, página inválida vira 1 e página além da última vira a última. */
export function listarNoticias(noticias: Noticia[], parametros: ParametrosLista): ResultadoLista {
  const opcoes = categoriasDisponiveis(noticias);
  const pedida = primeiro(parametros.categoria);
  const categoria = pedida ? (opcoes.find((o) => o.slug === slugCategoria(pedida)) ?? null) : null;
  const filtradas = categoria ? noticias.filter((n) => n.categorias.some((nome) => slugCategoria(nome) === categoria.slug)) : noticias;

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const texto = primeiro(parametros.pagina)?.trim() ?? "";
  const numero = /^\d+$/.test(texto) ? Number(texto) : 1;
  const pagina = Math.min(Math.max(numero, 1), totalPaginas);

  return {
    itens: filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    total: filtradas.length,
    pagina,
    totalPaginas,
    categoria,
  };
}

/** Endereço da lista, omitindo o que é padrão (Todas e página 1). */
export function hrefLista({ categoria, pagina }: { categoria?: string | null; pagina?: number }): string {
  const consulta = new URLSearchParams();
  if (categoria) consulta.set("categoria", categoria);
  if (pagina && pagina > 1) consulta.set("pagina", String(pagina));
  const texto = consulta.toString();
  return texto ? `/noticias?${texto}` : "/noticias";
}
