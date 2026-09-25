import { ROTAS } from "@/lib/site";

export const HERO = {
  rotulo: "Destaques da FAPERON",
  faperon: {
    titulo: "A voz do produtor rural de Rondônia",
    texto:
      "A Federação da Agricultura e Pecuária do Estado de Rondônia representa quem produz, defende o setor e transforma dados oficiais em informação para decidir.",
    cta_texto: "Conheça a FAPERON",
    cta_url: ROTAS.sobre,
    imagem: "/hero/faperon.jpg",
    posicao: "50% 72%",
  },
  numeros: {
    titulo: "Rondônia em números",
  },
  senar: {
    etiqueta: "Sistema FAPERON/SENAR",
    titulo: "Capacitação e assistência técnica para quem vive do campo",
    texto:
      "O Serviço Nacional de Aprendizagem Rural (SENAR), ligado à CNA, e a FAPERON levam formação e assistência técnica aos produtores e trabalhadores rurais de Rondônia.",
    cta_texto: "Conheça o Sistema FAPERON/SENAR",
    cta_url: "https://sistemafaperon.org.br/",
    imagem: "/hero/senar.jpg",
    posicao: "50% 55%",
  },
} as const;
