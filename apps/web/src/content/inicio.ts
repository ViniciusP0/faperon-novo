import { CNA_COMMODITIES_URL } from "@/lib/site";

export const INICIO = {
  central: {
    titulo: "Central de Inteligência Agropecuária de Rondônia",
    texto:
      "Dados oficiais do IBGE sobre lavouras e pecuária dos 52 municípios de Rondônia: ranking, série histórica, comparação e análise estratégica em um só painel.",
    cta_texto: "Conheça a Central de Inteligência",
    cta_url: "/central-de-inteligencia",
  },
  commodities: {
    titulo: "Preços das commodities",
    texto:
      "A CNA acompanha os preços praticados nas principais bolsas do mundo e nas praças brasileiras e atualiza as cotações das commodities todos os dias.",
    cta_texto: "Confira os preços na CNA",
    url: CNA_COMMODITIES_URL,
  },
  nosso_agro: {
    titulo: "Nosso Agro",
    texto: "A força do campo rondoniense em números: lavouras, rebanhos e produção de origem animal, município a município.",
  },
} as const;
