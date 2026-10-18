export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
export const WIX_URL = "https://www.faperon.com.br";

/** Endereços reais de páginas que continuam só no site atual (Wix). Conferidos em 24/09/2026; o Wix usa nomes como /blank-6, então não dá para deduzir. */
export const WIX_PAGINAS = {
  transparencia: `${WIX_URL}/portaldatranspar%C3%AAncia`,
} as const;
export const CNA_COMMODITIES_URL = "https://www.cnabrasil.org.br/servicos/precos-commodities";

/** Rotas internas das páginas institucionais, com conteúdo verídico extraído do site atual em 25/09/2026. */
export const ROTAS = {
  sobre: "/sobre",
  informativos: "/informativos-tecnicos",
  noticias: "/noticias",
  galeria: "/galeria",
  faleConosco: "/fale-conosco",
  login: "/login",
  privacidade: "/politica-de-privacidade",
} as const;

export interface ItemMenu {
  label: string;
  href: string;
  externo?: boolean;
}

export const MENU: ItemMenu[] = [
  { label: "Início", href: "/" },
  { label: "Central de Inteligência", href: "/central-de-inteligencia" },
  { label: "Sobre", href: ROTAS.sobre },
  { label: "Informativos Técnicos", href: ROTAS.informativos },
  { label: "Notícias", href: ROTAS.noticias },
  { label: "Galeria", href: ROTAS.galeria },
  { label: "Fale Conosco", href: ROTAS.faleConosco },
];

/** Na área logada o cabeçalho troca o menu do site por este (as páginas públicas ficam com MENU). */
export const MENU_SISTEMA: ItemMenu[] = [
  { label: "Início do sistema", href: "/sistema" },
  { label: "Agenda", href: "/sistema/agenda" },
  { label: "Frotas", href: "/sistema/frotas" },
  { label: "Espaços", href: "/sistema/espacos" },
  { label: "Contas", href: "/sistema/contas" },
  { label: "Atividades", href: "/sistema/atividades" },
  { label: "Indicadores", href: "/sistema/indicadores" },
  { label: "Relatórios", href: "/sistema/relatorios" },
];

export const LINKS_INSTITUCIONAIS: ItemMenu[] = [
  { label: "Transparência", href: WIX_PAGINAS.transparencia, externo: true },
  { label: "Sistema FAPERON – SENAR", href: "https://sistemafaperon.org.br/", externo: true },
  { label: "IBGE – SIDRA", href: "https://sidra.ibge.gov.br/", externo: true },
];
