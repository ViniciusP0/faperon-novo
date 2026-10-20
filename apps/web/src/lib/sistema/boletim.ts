import { podeGerirTags } from "./tags";

/** O boletim é da coordenação e da gestão: mesma regra de quem gere as tags (não duplicar). */
export const podeVerBoletim = podeGerirTags;

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "2026-10-20" -> "20/10 · ter". O dia da semana vem do calendário em UTC a partir das partes
 *  da data, sem passar pelo fuso do navegador. */
export function rotuloDia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const semana = DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]!;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} · ${semana}`;
}
