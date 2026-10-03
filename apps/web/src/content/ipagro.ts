/**
 * Conteúdo da página do IPAGRO. A página original no site da FAPERON está vazia; tudo aqui vem de fontes públicas
 * conferidas em 02/10/2026 e cada bloco aponta a sua fonte. Nada foi inferido além do que elas dizem.
 */
export interface Fonte {
  rotulo: string;
  url: string;
}

export const IPAGRO = {
  seo: {
    titulo: "IPAGRO",
    descricao:
      "Instituto de Pesquisa, Serviços e Desenvolvimento Agropecuário de Rondônia, entidade do Sistema FAPERON: ficha institucional e o Diagnóstico da Piscicultura de Rondônia.",
  },
  hero: {
    antes: "Pesquisa e serviços para o",
    forte: "desenvolvimento agropecuário",
    depois: "de Rondônia.",
    texto:
      "O IPAGRO é o Instituto de Pesquisa, Serviços e Desenvolvimento Agropecuário de Rondônia e integra o Sistema FAPERON ao lado da federação, do SENAR-RO, dos sindicatos rurais e da Comissão Mulheres.",
  },
  ficha: [
    { rotulo: "Nome", valor: "Instituto de Pesquisa, Serviços e Desenvolvimento Agropecuário de Rondônia (IPAGRO)" },
    { rotulo: "Natureza jurídica", valor: "Associação privada" },
    { rotulo: "CNPJ", valor: "12.367.387/0001-06" },
    { rotulo: "Abertura", valor: "29 de julho de 2010" },
    { rotulo: "Atividade principal", valor: "Serviços de agronomia e consultoria às atividades agrícolas e pecuárias" },
    { rotulo: "Sede", valor: "Avenida João Goulart, sala B, Nossa Senhora das Graças, Porto Velho (RO)" },
  ],
  fichaFontes: [
    { rotulo: "Mapa das OSC (Ipea)", url: "https://mapaosc.ipea.gov.br/detalhar/1212684" },
    {
      rotulo: "Casa dos Dados (CNPJ)",
      url: "https://casadosdados.com.br/solucao/cnpj/instituto-de-pesquisa-servicos-e-desenvolvimento-agropecuario-de-de-rondonia-ipagro-12367387000106",
    },
  ] satisfies Fonte[],
  diagnostico: {
    etiqueta: "Trabalho em destaque",
    titulo: "Diagnóstico da Piscicultura de Rondônia",
    texto:
      "O diagnóstico foi feito pelo Sistema FAPERON/SENAR e pelos Sindicatos dos Produtores Rurais, com a colaboração do IPAGRO, para reunir dados sobre a atividade em todo o estado.",
    linha: [
      {
        data: "23 de maio de 2023",
        texto:
          "Na 10ª Rondônia Rural Show, o deputado estadual Ismael Crispin anunciou R$ 155 mil para o diagnóstico da piscicultura, com recursos destinados ao IPAGRO. O objetivo declarado era levantar dados precisos sobre produção, desafios dos produtores e demandas de mercado.",
        fonte: {
          rotulo: "Rondoniagora",
          url: "https://www.rondoniagora.com/politica/na-rondonia-rural-show-ismael-crispin-anuncia-r-155-mil-para-impulsionar-a-piscicultura",
        } satisfies Fonte,
      },
      {
        data: "29 de abril de 2025",
        texto:
          "O Sistema FAPERON/SENAR entregou o diagnóstico ao Conselho dos Secretários Municipais de Agricultura (CONSEMAGRI), ao deputado Ismael Crispin e aos secretários municipais de agricultura.",
        fonte: {
          rotulo: "Sistema FAPERON/SENAR",
          url: "https://sistemafaperon.org.br/2025/04/29/sistema-faperon-senar-entrega-diagnostico-da-piscicultura-de-rondonia-aos-secretarios-municipais-de-agricultura/",
        } satisfies Fonte,
      },
    ],
    levantou: [
      "Geocaracterização da atividade",
      "Estrutura física instalada",
      "Número de unidades produtivas",
      "Áreas de tanques escavados e de represas",
      "Potencial produtivo de cada município",
    ],
  },
  transparencia: {
    titulo: "Transparência: comunicado de recebimento de recursos",
    texto:
      "Documento assinado pelo presidente do IPAGRO, Hélio Dias de Souza, em Porto Velho, em 5 de dezembro de 2023, sobre os recursos recebidos para o diagnóstico da aquicultura.",
    dados: [
      { rotulo: "Termo de fomento", valor: "nº 185/PGE-2023" },
      { rotulo: "Concedente", valor: "Estado de Rondônia, por meio da SEAGRI" },
      { rotulo: "Convenente", valor: "IPAGRO (CNPJ 12.367.387/0001-06)" },
      { rotulo: "Valor total do projeto", valor: "R$ 155.000,00" },
      { rotulo: "Assinatura do termo", valor: "17 de outubro de 2023" },
      { rotulo: "Vigência", valor: "2 anos" },
      { rotulo: "Processo SEI", valor: "0025.003612/2023-71" },
    ],
    objeto:
      "Contratação de empresa especializada na elaboração de diagnóstico da aquicultura, com mapeamento geo, relatório da análise e localização de áreas, no Estado de Rondônia.",
    arquivo: {
      rotulo: "Baixar o comunicado (PDF)",
      url: "/ipagro/comunicado-de-recebimento-de-recursos.pdf",
      nome: "comunicado-de-recebimento-de-recursos.pdf",
      tamanho: "157 KB, 1 página",
    },
    portal: {
      rotulo: "Ver no Portal do Sistema FAPERON",
      url: "https://sistemafaperon.org.br/instituto_ipagro/",
    },
  },
} as const;
