/** Produtos em destaque no seletor do painel (slugs do catálogo da API). Só aparecem os que existem no catálogo. */
export const PRODUTOS_EM_DESTAQUE: Record<"agricultura" | "pecuaria", string[]> = {
  agricultura: ["soja-em-grao", "milho-em-grao", "cafe-em-grao-total", "cacau-em-amendoa", "mandioca", "feijao-em-grao"],
  pecuaria: ["bovino", "leite", "galinaceos-total", "suino-total"],
};

/** Seções da página, na ordem em que aparecem. `aba` é o valor equivalente do parâmetro antigo da URL. */
export const SECOES = [
  { id: "numeros", rotulo: "Números", aba: "ranking" },
  { id: "ranking", rotulo: "Ranking", aba: "ranking" },
  { id: "evolucao", rotulo: "Evolução", aba: "serie" },
  { id: "comparacao", rotulo: "Comparação", aba: "comparacao" },
  { id: "analise", rotulo: "Análise", aba: "analise" },
] as const;
