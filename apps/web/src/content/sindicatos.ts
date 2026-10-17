import dados from "./sindicatos.json";

export interface Sindicato {
  nome: string;
  presidente: string;
  endereco: string;
  telefones: string[];
  email: string;
  lat: number;
  lng: number;
  /** Quão exata é a coordenada: `endereco` (número da rua), `rua` (só a rua) ou `cidade` (centro do município). */
  precisao: "endereco" | "rua" | "cidade";
  /** Fachada, em `public/sindicatos`; ausente quando o site original da FAPERON não tem foto. */
  foto?: string;
}

/**
 * Cadastro copiado da página "Sindicatos Rurais" do site atual da FAPERON em 02/10/2026. As fotos vieram da mesma página
 * em 17/10/2026; as coordenadas foram obtidas no Nominatim (OpenStreetMap) a partir do endereço.
 */
export const SINDICATOS = dados as Sindicato[];

export const SINDICATOS_TEXTO = {
  seo: {
    titulo: "Sindicatos Rurais",
    descricao: "Mapa dos Sindicatos dos Produtores Rurais de Rondônia: encontre o do seu município com foto, endereço, presidente, telefone e e-mail.",
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
