import type { Fonte } from "./ipagro";

const SENAR_VISITA: Fonte = {
  rotulo: "Sistema FAPERON/SENAR, 23/09/2024",
  url: "https://sistemafaperon.org.br/2024/09/23/senar-rondonia-recebe-visita-institucional-de-liderancas-femininas-do-agro-para-fortalecer-parcerias-e-acoes-em-prol-das-mulheres-do-campo/",
};

/**
 * Conteúdo da página da Comissão Mulheres FAPERON. A página original no site da FAPERON está vazia; tudo aqui vem de
 * fontes públicas conferidas em 02/10/2026 e cada fato aponta a sua fonte. Os cargos valem para a data de cada fonte.
 */
export const MULHERES = {
  seo: {
    titulo: "Comissão Mulheres FAPERON",
    descricao:
      "A Comissão Estadual das Mulheres da FAPERON: o que faz, como se liga à Comissão Nacional das Mulheres do Agro da CNA e a linha do tempo de encontros em Rondônia.",
  },
  hero: {
    antes: "Mais espaço e",
    forte: "liderança",
    depois: "para as mulheres do campo.",
    texto:
      "A Comissão Estadual das Mulheres da FAPERON atua pelo desenvolvimento e pela capacitação das mulheres do agro e pela presença feminina dentro do Sistema FAPERON.",
  },
  atuacao: {
    titulo: "O que a Comissão faz",
    itens: [
      { titulo: "Desenvolvimento e capacitação", texto: "Ações de formação para mulheres que atuam no setor agropecuário." },
      { titulo: "Participação no Sistema", texto: "Fortalecimento da presença das mulheres na federação e nos sindicatos rurais." },
      { titulo: "Parcerias estratégicas", texto: "Articulação com o SENAR-RO e com a Comissão Nacional da CNA para ampliar as ações." },
    ],
    fonte: SENAR_VISITA,
  },
  lideranca: {
    titulo: "Quem lidera",
    texto:
      "Em setembro de 2024, a Comissão Mulheres FAPERON era presidida por Antonielly Arce Rottoli, que também preside o Sindicato dos Produtores Rurais de Alto Paraíso e era vice-presidente da Comissão Nacional das Mulheres do Agro, da CNA. Sirlei Bedin, representante da FAPERON, integra as comissões estadual e nacional.",
    fonte: SENAR_VISITA,
  },
  nacional: {
    titulo: "Rede nacional da CNA",
    texto:
      "A Comissão Nacional das Mulheres do Agro, da CNA, tem o objetivo de ampliar a participação das mulheres no Sistema Sindical e desenvolver sua capacidade de liderança no setor agropecuário. É formada por representantes das Federações de Agricultura dos estados e cresceu de 3 para 16 comissões estaduais.",
    numeros: [
      { valor: "16", rotulo: "comissões estaduais" },
      { valor: "≈ 3 mil", rotulo: "mulheres alcançadas em feiras e eventos" },
    ],
    linhas: ["Desenvolvimento de lideranças femininas", "Apoio aos grupos estaduais", "Representação política e técnica"],
    fonte: { rotulo: "CNA, Mulheres do Agro", url: "https://cnabrasil.org.br/areas-de-atuacao/mulheres-do-agro" } satisfies Fonte,
  },
  linhaDoTempo: {
    titulo: "Encontros e ações em Rondônia",
    itens: [
      {
        data: "2019",
        titulo: "Nasce o Mulheres do Agro Rondônia",
        texto:
          "O movimento foi criado pela contadora Beatriz Rosa e pela produtora rural Antonielly Rottoli. É uma rede de voluntárias de toda a cadeia do agro, sem fins lucrativos e sem vínculo político, institucional ou com empresas.",
        fonte: {
          rotulo: "Revista AgroRondônia",
          url: "https://www.agrorondonia.com.br/noticias/agroempreendedorismo/3-encontro-mulheres-do-agro-rondonia-acontece-em-outubro-em-ariquemes",
        } satisfies Fonte,
      },
      {
        data: "13 e 14 de outubro de 2023",
        titulo: "Comissão Nacional em Rondônia",
        texto:
          "A Comissão Nacional das Mulheres do Agro cumpriu agenda em Porto Velho e em Ariquemes, com reunião sobre a participação feminina no agro local e presença no 3º Encontro Mulheres do Agro Rondônia, que teve como tema a sucessão familiar e o empreendedorismo na agricultura amazônica.",
        fonte: {
          rotulo: "CNA",
          url: "https://cnabrasil.org.br/noticias/comissao-nacional-das-mulheres-do-agro-cumpre-agenda-em-rondonia",
        } satisfies Fonte,
      },
      {
        data: "14 de outubro de 2023",
        titulo: "3º Encontro Mulheres do Agro Rondônia",
        texto: "No Amazon Music Hall, em Ariquemes, o encontro reuniu mais de 400 mulheres do setor. O SENAR/FAPERON foi patrocinador diamante.",
        fonte: {
          rotulo: "Revista AgroRondônia",
          url: "https://www.agrorondonia.com.br/noticias/agricultura/encontro-reune-mais-de-400-mulheres-do-agro-em-rondonia",
        } satisfies Fonte,
      },
      {
        data: "20 de setembro de 2024",
        titulo: "Visita institucional ao SENAR Rondônia",
        texto:
          "Lideranças da Comissão visitaram o SENAR-RO, recebidas pelo superintendente Elmerson Lira, para fortalecer as relações e discutir o apoio do SENAR às ações da Comissão Estadual das Mulheres.",
        fonte: SENAR_VISITA,
      },
      {
        data: "2026",
        titulo: "6º Congresso Mulheres do Agro Rondônia",
        texto:
          "Em Ariquemes, uma caravana do Sistema FAPERON/SENAR, com presidentes de sindicatos rurais e colaboradoras, participou do congresso. A Comissão Mulheres FAPERON manteve um estande e a FAPERON foi patrocinadora ouro do evento.",
        fonte: {
          rotulo: "FAPERON",
          url: "https://www.faperon.com.br/post/caravana-do-sistema-faperon-senar-participa-do-6%C2%BA-congresso-mulheres-do-agro-rond%C3%B4nia",
        } satisfies Fonte,
      },
    ],
  },
} as const;
