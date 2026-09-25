export type RedeSocial = "whatsapp" | "instagram" | "facebook" | "linkedin" | "youtube";

export interface LinkRede {
  rede: RedeSocial;
  rotulo: string;
  url: string;
}

export const CONTATO = {
  titulo: "Fale Conosco",
  subtitulo: "Envie sua mensagem ou fale com a FAPERON pelos canais oficiais",
  endereco: {
    linhas: ["Rua João Goulart, 1843 - Nossa Sra. das Graças", "Porto Velho - RO, 78915-450"],
  },
  mapaUrl: "https://www.google.com/maps/search/?api=1&query=Rua+Jo%C3%A3o+Goulart+1843+Porto+Velho+RO",
  telefone: {
    texto: "(69) 3214-8371",
    href: "tel:+556932148371",
  },
  whatsapp: {
    numero: "556932247620",
    texto: "(69) 3224-7620",
  },
  redes: [
    { rede: "whatsapp", rotulo: "WhatsApp", url: "https://wa.me/556932247620" },
    { rede: "instagram", rotulo: "Instagram", url: "https://www.instagram.com/sistema_faperon_senar_ro/" },
    { rede: "facebook", rotulo: "Facebook", url: "https://www.facebook.com/SistemaFAPERONSENAR" },
    { rede: "linkedin", rotulo: "LinkedIn", url: "https://www.linkedin.com/company/sistema-faperon-senar-rond%C3%B4nia/" },
    { rede: "youtube", rotulo: "YouTube", url: "https://www.youtube.com/@FaperonSenarRO" },
  ] satisfies LinkRede[],
  campos: {
    primeiroNome: "Primeiro nome",
    ultimoNome: "Último nome",
    email: "E-mail",
    telefone: "Telefone para contato",
    mensagem: "Mensagem",
  },
  seo: {
    titulo: "Fale Conosco",
    descricao: "Endereço, telefone, redes sociais e formulário de contato da FAPERON em Porto Velho (RO).",
  },
};
