export interface BannerSenar {
  id: string;
  imagem: string;
  alt: string;
  largura: number;
  altura: number;
}

export const SENAR = {
  titulo: "Sistema FAPERON/SENAR",
  link_texto: "Conheça o Sistema FAPERON/SENAR",
  url: "https://sistemafaperon.org.br/",
  rotulo: "Banners do Sistema FAPERON/SENAR",
  banners: [
    {
      id: "institucional",
      imagem: "/senar/banner-1.jpg",
      alt: "Transformando o campo e fortalecendo o agro com conhecimento e inovação. FAPERON SENAR, Sindicatos dos Produtores Rurais de Rondônia.",
      largura: 1814,
      altura: 672,
    },
    {
      id: "etec",
      imagem: "/senar/banner-2.jpg",
      alt: "Processo Seletivo Senar e-Tec 2026.1. Inscrições abertas: conecte-se com seu futuro no agro. Inscreva-se já. SENAR Formação Técnica.",
      largura: 1567,
      altura: 672,
    },
    {
      id: "ateg",
      imagem: "/senar/banner-3.jpg",
      alt: "Credenciamento de técnicos de campo da ATeG 07/2025. Inscrições de 25/07/2025 a 30/11/2025. FAPERON SENAR.",
      largura: 1568,
      altura: 672,
    },
  ] satisfies BannerSenar[],
} as const;
