export type NomeIcone = "trophy" | "chart" | "compare" | "insight" | "pdf" | "shield";

export const CENTRAL = {
  titulo: "Central de Inteligência",
  subtitulo: "Os números do agro de Rondônia, para decidir melhor",
  paragrafos: [
    "A Central de Inteligência Agropecuária reúne, em um só lugar, os dados oficiais do IBGE sobre as lavouras e a pecuária dos 52 municípios de Rondônia. Escolha um produto e um indicador, defina o período e veja o ranking dos municípios, a evolução ao longo dos anos e uma análise estratégica pronta para apoiar decisões de produtores, sindicatos, gestores públicos e empresas.",
    "Todos os números vêm da Pesquisa Agrícola Municipal (PAM) e da Pesquisa da Pecuária Municipal (PPM), com a fonte e a data de atualização informadas em cada tela.",
  ],
  blocos: [
    { titulo: "Ranking de municípios", texto: "Veja quem mais produz, com posição, valor e participação no total do estado.", icone: "trophy" },
    { titulo: "Série histórica", texto: "Acompanhe a evolução de cada indicador ano a ano, no estado ou em um município.", icone: "chart" },
    { titulo: "Comparação", texto: "Coloque até cinco municípios ou produtos lado a lado.", icone: "compare" },
    { titulo: "Análise estratégica", texto: "Texto gerado por regras claras: variação, crescimento médio anual e concentração.", icone: "insight" },
    { titulo: "Relatório em PDF", texto: "Leve o recorte da sua consulta, com gráfico, ranking e análise, em um arquivo.", icone: "pdf" },
    { titulo: "Fontes oficiais", texto: "PAM e PPM do IBGE, com a tabela e a data de atualização sempre visíveis.", icone: "shield" },
  ] satisfies { titulo: string; texto: string; icone: NomeIcone }[],
  cta_texto: "Abrir o Painel Agro Analítico",
  cta_url: "/painel",
  seo: {
    titulo: "Central de Inteligência",
    descricao:
      "Painel com dados oficiais do IBGE sobre agricultura e pecuária dos municípios de Rondônia: ranking, série histórica, comparação e análise.",
  },
};
