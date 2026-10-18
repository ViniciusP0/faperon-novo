import type { CategoriaDespesa, CentroDeCusto, Despesa, StatusDespesa } from "./tipos";

export const ROTULO_CATEGORIA: Record<CategoriaDespesa, string> = {
  material: "Material de escritório",
  combustivel: "Combustível",
  alimentacao: "Alimentação",
  hospedagem: "Hospedagem",
  transporte: "Transporte",
  servicos: "Serviços",
  eventos: "Eventos",
  outros: "Outros",
};

export const ROTULO_STATUS_DESPESA: Record<StatusDespesa, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  devolvida: "Devolvida",
};

/** Comprovante cujo data: URL (base64, ~4/3 do arquivo) passa disto guarda só o nome: o
 *  localStorage do protótipo tem uns 5 MB para tudo. */
export const LIMITE_COMPROVANTE = 400_000;

/** Só imagem e PDF: o comprovante volta como link de download e não deve ser HTML nem SVG. */
export const TIPOS_COMPROVANTE = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;

export function comprovanteSeguro(dados: string | null): boolean {
  return dados != null && TIPOS_COMPROVANTE.some((tipo) => dados.startsWith(`data:${tipo};base64,`));
}

export function validarDespesa(d: Pick<Despesa, "descricao" | "data" | "valor">): string | null {
  if (!d.descricao.trim()) return "Descreva a despesa.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) return "Informe a data da despesa.";
  if (!(d.valor > 0)) return "Informe um valor maior que zero.";
  return null;
}

export function podeEditar(d: Despesa, funcionarioId: string): boolean {
  return d.funcionarioId === funcionarioId && (d.status === "rascunho" || d.status === "devolvida");
}

export interface TotalDoCentro {
  centro: CentroDeCusto;
  total: number;
  porCategoria: Partial<Record<CategoriaDespesa, number>>;
}

/** Só enviadas e aprovadas contam: rascunho e devolvida ainda não são despesa reconhecida. */
export function totaisPorCentro(despesas: Despesa[], de: string, ate: string): TotalDoCentro[] {
  const mapa = new Map<CentroDeCusto, TotalDoCentro>();
  for (const d of despesas) {
    if ((d.status !== "enviada" && d.status !== "aprovada") || d.data < de || d.data > ate) continue;
    const t = mapa.get(d.centro) ?? { centro: d.centro, total: 0, porCategoria: {} };
    t.total = Math.round((t.total + d.valor) * 100) / 100;
    t.porCategoria[d.categoria] = Math.round(((t.porCategoria[d.categoria] ?? 0) + d.valor) * 100) / 100;
    mapa.set(d.centro, t);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || a.centro.localeCompare(b.centro));
}
