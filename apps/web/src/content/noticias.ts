import dados from "./noticias.json";

export interface Noticia {
  slug: string;
  titulo: string;
  resumo: string;
  /** Data ISO (AAAA-MM-DD). */
  data: string;
  /** Caminho em public/noticias, ou null quando a notícia não tem imagem. */
  imagem: string | null;
  /** Endereço da notícia no site Wix atual. */
  url_original: string | null;
}

/** Da mais recente para a mais antiga. Regenerado por `npm run importar:noticias` (ADR 0018). */
export const NOTICIAS: Noticia[] = dados;

export const noticiasRecentes = (quantidade: number): Noticia[] => NOTICIAS.slice(0, quantidade);
