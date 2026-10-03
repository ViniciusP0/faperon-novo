import dados from "./sindicatos.json";

export interface Sindicato {
  nome: string;
  presidente: string;
  endereco: string;
  telefones: string[];
  email: string;
}

/** Cadastro copiado da página "Sindicatos Rurais" do site atual da FAPERON em 02/10/2026. */
export const SINDICATOS: Sindicato[] = dados;

export const SINDICATOS_TEXTO = {
  seo: {
    titulo: "Sindicatos Rurais",
    descricao: "Encontre o Sindicato dos Produtores Rurais do seu município em Rondônia: presidente, telefone, e-mail e endereço.",
  },
  hero: {
    antes: "Encontre o sindicato rural",
    forte: "do seu município",
    depois: "em Rondônia.",
    texto:
      "Os Sindicatos dos Produtores Rurais são a base da FAPERON. É por eles que o produtor se associa, é representado e chega às ações do Sistema FAPERON/SENAR.",
  },
  acao: {
    titulo: "Sindicato em Ação",
    texto:
      "Projeto do Sistema FAPERON/SENAR, lançado em 12 de março de 2026 em Candeias do Jamari, para fortalecer os sindicatos rurais e desenvolver lideranças alinhadas às necessidades dos produtores. Tem cinco etapas e duração inicial de 10 meses.",
    etapas: [
      "Mobilização e diagnóstico",
      "Capacitação de líderes",
      "Planejamento estratégico simplificado",
      "Comunicação e engajamento",
      "Avaliação e consolidação",
    ],
    fonte: {
      rotulo: "FAPERON",
      url: "https://www.faperon.com.br/post/sistema-faperon-senar-lan%C3%A7a-projeto-sindicato-em-a%C3%A7%C3%A3o-em-candeias-do-jamari",
    },
  },
} as const;
