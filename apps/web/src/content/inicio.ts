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
  sistema: {
    etiqueta: "Um só sistema",
    titulo: "Sistema FAPERON",
    texto:
      "A FAPERON, o SENAR-RO, o IPAGRO, os sindicatos rurais e a Comissão Mulheres atuam juntos pelo produtor rural de Rondônia, do campo à representação.",
    descricoes: {
      "SENAR Rondônia": "Formação profissional e assistência técnica para produtores e trabalhadores rurais.",
      IPAGRO: "Conheça o IPAGRO e a atuação do instituto dentro do Sistema FAPERON.",
      "Sindicatos Rurais": "Encontre o sindicato rural do seu município, com presidente, telefone, e-mail e endereço.",
      "Comissão Mulheres": "Ações e iniciativas da Comissão Mulheres FAPERON voltadas às mulheres do campo.",
    } as Record<string, string>,
  },
  nosso_agro: {
    titulo: "Nosso Agro",
    texto: "A força do campo rondoniense em números: lavouras, rebanhos e produção de origem animal, município a município.",
  },
} as const;
