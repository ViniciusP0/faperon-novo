import dados from "./galeria.json";

export type CategoriaGaleria = "faperon" | "senar";

export interface FotoGaleria {
  /** Foto ampliada, em `public/galeria`. */
  src: string;
  miniatura: string;
  largura: number;
  altura: number;
}

export interface AlbumGaleria {
  slug: string;
  titulo: string;
  /** Data ISO (AAAA-MM-DD) da matéria de onde saíram as fotos. */
  data: string;
  categoria: CategoriaGaleria;
  /** Matéria completa, no site da FAPERON ou no do Sistema FAPERON/SENAR. */
  url: string;
  fotos: FotoGaleria[];
}

export const CATEGORIAS_GALERIA: Record<CategoriaGaleria, string> = { faperon: "FAPERON", senar: "SENAR" };

/**
 * Álbuns de eventos, do mais recente para o mais antigo. As fotos vieram das matérias do site atual da FAPERON
 * (faperon.com.br) e do site do Sistema FAPERON/SENAR (sistemafaperon.org.br) em 17/10/2026, até 8 por evento.
 */
export const ALBUNS: AlbumGaleria[] = dados as AlbumGaleria[];

export const filtrarAlbuns = (albuns: AlbumGaleria[], categoria: CategoriaGaleria | null): AlbumGaleria[] =>
  categoria ? albuns.filter((a) => a.categoria === categoria) : albuns;

export const totalDeFotos = (albuns: AlbumGaleria[]): number => albuns.reduce((soma, a) => soma + a.fotos.length, 0);
