export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
export const WIX_URL = "https://www.faperon.com.br";
export const CNA_COMMODITIES_URL = "https://www.cnabrasil.org.br/servicos/precos-commodities";

export interface ItemMenu {
  label: string;
  href: string;
  externo?: boolean;
}

export const MENU: ItemMenu[] = [
  { label: "Início", href: "/" },
  { label: "Central de Inteligência", href: "/central-de-inteligencia" },
  { label: "Painel Agro RO", href: "/painel" },
  { label: "Sobre", href: `${WIX_URL}/sobre`, externo: true },
  { label: "Informativos Técnicos", href: `${WIX_URL}/informativos-tecnicos`, externo: true },
  { label: "Fale Conosco", href: `${WIX_URL}/fale-conosco`, externo: true },
];

export const LINKS_INSTITUCIONAIS: ItemMenu[] = [
  { label: "Transparência", href: `${WIX_URL}/transparencia`, externo: true },
  { label: "Sistema FAPERON – SENAR", href: "https://sistemafaperon.org.br/", externo: true },
  { label: "IBGE – SIDRA", href: "https://sidra.ibge.gov.br/", externo: true },
];
