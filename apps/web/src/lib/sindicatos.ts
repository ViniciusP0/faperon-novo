import type { Sindicato } from "@/content/sindicatos";

/** Sem acento e em minúsculas, para a busca achar "Ji-Paraná" ao digitar "ji-parana". */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Sindicatos cujo nome (município) ou presidente contém o texto buscado. */
export function filtrarSindicatos(sindicatos: Sindicato[], busca: string): Sindicato[] {
  const q = normalizar(busca.trim());
  if (!q) return sindicatos;
  return sindicatos.filter((s) => normalizar(`${s.nome} ${s.presidente}`).includes(q));
}

export const telefoneHref = (t: string) => `tel:+55${t.replace(/\D/g, "")}`;
