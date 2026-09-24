// Tipos escritos à mão a partir de docs/api-contract.md.
// Regenerar a partir do OpenAPI do Django: npm run gen:api (gera api-schema.d.ts).

export type Segmento = "agricultura" | "pecuaria";
export type Agregacao = "soma" | "media_ponderada" | "nao_agregavel";
export type StatusValor = "ok" | "sigiloso" | "inexistente";

export interface Meta {
  fonte: string;
  tabela_sidra: number;
  url_fonte: string;
  atualizado_em: string | null;
}

export interface ProdutoResumo {
  slug: string;
  nome: string;
  segmento: Segmento;
  tabela_sidra?: number;
}

export interface Indicador {
  slug: string;
  nome: string;
  unidade: string;
  agregacao: Agregacao;
}

export interface Municipio {
  codigo_ibge: string;
  nome: string;
}

export interface MetaGeral {
  ultima_carga: string | null;
  cargas: { tabela: number; status: string; concluida_em: string | null; linhas: number }[];
  anos: { min: number; max: number };
}

export interface ItemRanking {
  posicao: number | null;
  municipio: Municipio;
  valor: number | null;
  status: StatusValor;
  percentual_total: number | null;
}

export interface RankingResposta {
  produto: ProdutoResumo;
  indicador: Indicador;
  inicio: number;
  fim: number;
  ano_referencia: number;
  total_estadual: number | null;
  itens: ItemRanking[];
  meta: Meta;
}

export interface Ponto {
  ano: number;
  valor: number | null;
  status: StatusValor;
}

export interface SerieResposta {
  produto: ProdutoResumo;
  indicador: Indicador;
  municipio: Municipio | null;
  inicio: number;
  fim: number;
  pontos: Ponto[];
  meta: Meta;
}

export interface SerieComparada {
  id: string;
  nome: string;
  pontos: Ponto[];
}

export interface ComparacaoResposta {
  modo: "municipios" | "produtos";
  indicador: Indicador;
  unidade: string;
  inicio: number;
  fim: number;
  anos: number[];
  series: SerieComparada[];
  meta: Meta;
}

export interface AnaliseMetricas {
  variacao_absoluta: number | null;
  variacao_percentual: number | null;
  cagr_percentual: number | null;
  maior_ano: { ano: number; valor: number } | null;
  menor_ano: { ano: number; valor: number } | null;
  top5: { municipio: Municipio; valor: number; percentual: number | null }[];
  concentracao_top5_percentual: number | null;
}

export interface AnaliseResposta {
  titulo: string;
  paragrafos: string[];
  metricas: AnaliseMetricas;
  meta: Meta;
}

export interface ErroApi {
  erro: string;
  campos?: Record<string, string>;
}

export interface DestaqueLider {
  municipio: { codigo_ibge: string; nome: string };
  valor: number | null;
  percentual_total: number | null;
}

export interface Destaque {
  chave: string;
  rotulo: string;
  produto: { slug: string; nome: string; segmento: Segmento };
  indicador: { slug: string; nome: string; unidade: string; agregacao: string };
  ano_referencia: number;
  total: number | null;
  serie: Ponto[];
  variacao_percentual: number | null;
  top: DestaqueLider[];
  meta: Meta;
}

export interface Destaques {
  itens: Destaque[];
  meta: { atualizado_em: string | null };
}
