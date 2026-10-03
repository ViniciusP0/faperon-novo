import { WIX_URL } from "@/lib/site";

export interface Cargo {
  cargo: string;
  nome: string;
}

export interface GrupoDiretoria {
  titulo: string;
  /** Coluna em que o grupo aparece na página; grupos com a mesma coluna são exibidos juntos. */
  coluna: string;
  membros: Cargo[];
}

export interface EntidadeSistema {
  nome: string;
  descricao: string;
  url: string;
  acao: string;
}

export const SOBRE = {
  titulo: "Sobre a FAPERON",
  destaque: { antes: "Desde 1983, a FAPERON", forte: "representa o produtor rural", depois: "de todos os 52 municípios de Rondônia." },
  subtitulo: "Federação da Agricultura e Pecuária do Estado de Rondônia",
  secoes: [
    { id: "quem-somos", titulo: "Quem somos" },
    { id: "missao-visao-valores", titulo: "Missão, visão e valores" },
    { id: "diretoria", titulo: "Diretoria" },
    { id: "estatuto", titulo: "Estatuto" },
    { id: "sistema", titulo: "Sistema FAPERON" },
  ],
  quem_somos: {
    paragrafos: [
      "A Federação da Agricultura e Pecuária do Estado de Rondônia (FAPERON) é uma entidade de grau superior sem fins lucrativos e uma das 27 entidades que integram a Confederação da Agricultura e Pecuária do Brasil (CNA).",
      "Criada em 1983, a FAPERON representa 36 Sindicatos dos Produtores Rurais e atua nos 52 municípios do Estado de Rondônia.",
    ],
    objetivos: [
      "A união da classe produtora rural",
      "A defesa do homem do campo e da economia agrícola",
      "A valorização da produção agrícola e a preservação do meio ambiente associada ao desenvolvimento da agropecuária e de produção de alimentos",
      "A defesa do livre comércio de produtos da agropecuária e da agroindústria",
    ],
    numeros: [
      { valor: "1983", rotulo: "Ano de fundação" },
      { valor: "36", rotulo: "Sindicatos rurais" },
      { valor: "52", rotulo: "Municípios de Rondônia" },
    ],
  },
  missao:
    "Representar, organizar e fortalecer os produtores rurais, defender seus direitos e interesses por meio dos Sindicatos dos Produtores Rurais, promovendo o desenvolvimento econômico e social do setor agropecuário no Estado de Rondônia.",
  visao: "Ser reconhecida como instituição de excelência na representação e zelo dos Produtores Rurais e contribuição para o desenvolvimento da sociedade.",
  valores: ["Protagonismo", "Responsabilidade social, econômica e ambiental", "Transparência", "Inovação", "Credibilidade"],
  diretoria: {
    gestao: "Gestão 2024-2027",
    grupos: [
      {
        titulo: "Presidência",
        coluna: "Presidência e vice-presidências",
        membros: [
          { cargo: "Presidente", nome: "Hélio Dias de Souza" },
          { cargo: "Vice-Presidente", nome: "Gustavo José Sartor" },
          { cargo: "2º Vice-Presidente", nome: "Alex Sandro Guaitolini" },
          { cargo: "3º Vice-Presidente", nome: "João Carlos Volpato" },
          { cargo: "4º Vice-Presidente", nome: "João Paulo da Silva Carneiro" },
        ],
      },
      {
        titulo: "Secretaria",
        coluna: "Secretaria e financeiro",
        membros: [
          { cargo: "1º Diretor(a) Secretário(a)", nome: "Lindinalva Pereira dos Santos Sousa" },
          { cargo: "2º Diretor(a) Secretário(a)", nome: "Adelaine dos Santos" },
        ],
      },
      {
        titulo: "Financeiro",
        coluna: "Secretaria e financeiro",
        membros: [
          { cargo: "1º Diretor Financeiro", nome: "José Orlean Gomes da Silva" },
          { cargo: "2º Diretor Financeiro", nome: "Antônio Vagno de Souza" },
        ],
      },
      {
        titulo: "Conselho Fiscal – Titulares",
        coluna: "Conselho Fiscal",
        membros: [
          { cargo: "Titular", nome: "José de Carvalho Sobrinho" },
          { cargo: "Titular", nome: "Miguel Nunes Neto" },
          { cargo: "Titular", nome: "Jair de Oliveira Ferro" },
        ],
      },
      {
        titulo: "Conselho Fiscal – Suplentes",
        coluna: "Conselho Fiscal",
        membros: [
          { cargo: "Suplente", nome: "José Severino Batista Juvino" },
          { cargo: "Suplente", nome: "Natã Feliciano da Silva" },
          { cargo: "Suplente", nome: "Renildo Luciano Nunes" },
        ],
      },
    ] satisfies GrupoDiretoria[],
  },
  /** Documento do Portal da Transparência do site atual (Wix). */
  estatuto: {
    titulo: "Estatuto FAPERON",
    descricao: "Norma que rege a organização e o funcionamento da federação.",
    data: "2025-01-01",
    url: `${WIX_URL}/_files/ugd/cbbcc7_c65a14b75e0c4045befbf6bf86ab544a.pdf`,
  },
  sistema: {
    entidades: [
      { nome: "SENAR Rondônia", descricao: "Portal do Sistema FAPERON | SENAR-RO.", url: "https://sistemafaperon.org.br/", acao: "Acessar" },
      { nome: "IPAGRO", descricao: "Instituto de pesquisa, serviços e desenvolvimento agropecuário.", url: "/ipagro", acao: "Acessar" },
      { nome: "Sindicatos Rurais", descricao: "Contatos dos sindicatos rurais de Rondônia.", url: "/sindicatos-rurais", acao: "Ver sindicatos" },
      { nome: "Comissão Mulheres", descricao: "Ações e encontros pelas mulheres do campo.", url: "/comissao-mulheres", acao: "Acessar" },
    ] satisfies EntidadeSistema[],
    calendario: {
      titulo: "Calendário do Sistema FAPERON | SENAR-RO",
      descricao: "Datas e eventos do ano, em PDF.",
      url: `${WIX_URL}/_files/ugd/cbbcc7_bde4b0133eae45ac92f34187506a857a.pdf`,
    },
  },
  seo: {
    titulo: "Sobre",
    descricao:
      "Quem é a FAPERON: missão, visão, valores e a diretoria da gestão 2024-2027 da Federação da Agricultura e Pecuária de Rondônia.",
  },
};
