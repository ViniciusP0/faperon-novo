import type { Evento, TipoAtividade, TipoEvento, TipoEventoEspaco, TipoLegenda } from "./tipos";

/** Catálogo único de tipos, na ordem em que a legenda os mostra. A cor diz o tipo em todo o sistema;
 *  na agenda, a forma (ponto, prédio, caminhão, chave) diz a origem. */
export const LEGENDA: Record<TipoLegenda, string> = {
  reuniao: "Reunião",
  viagem: "Viagem",
  compromisso: "Compromisso",
  capacitacao: "Capacitação",
  palestra: "Palestra",
  institucional: "Evento institucional",
  visita_tecnica: "Visita técnica",
  atendimento: "Atendimento ao produtor",
  administrativo: "Administrativo",
  outro: "Outro",
};

const ORDEM = Object.keys(LEGENDA) as TipoLegenda[];

/** Classes por tipo, escritas por extenso para o Tailwind achá-las. Tokens em globals.css: forte (texto,
 *  ícone, contorno) e suave (fundo); o forte sobre o suave passa de 4,5:1 nos dois temas. */
export const COR_TIPO: Record<TipoLegenda, { texto: string; fundo: string; contorno: string; ponto: string }> = {
  reuniao: { texto: "text-tipo-reuniao", fundo: "bg-tipo-reuniao-suave", contorno: "ring-tipo-reuniao", ponto: "bg-tipo-reuniao" },
  viagem: { texto: "text-tipo-viagem", fundo: "bg-tipo-viagem-suave", contorno: "ring-tipo-viagem", ponto: "bg-tipo-viagem" },
  compromisso: { texto: "text-tipo-compromisso", fundo: "bg-tipo-compromisso-suave", contorno: "ring-tipo-compromisso", ponto: "bg-tipo-compromisso" },
  capacitacao: { texto: "text-tipo-capacitacao", fundo: "bg-tipo-capacitacao-suave", contorno: "ring-tipo-capacitacao", ponto: "bg-tipo-capacitacao" },
  palestra: { texto: "text-tipo-palestra", fundo: "bg-tipo-palestra-suave", contorno: "ring-tipo-palestra", ponto: "bg-tipo-palestra" },
  institucional: { texto: "text-tipo-institucional", fundo: "bg-tipo-institucional-suave", contorno: "ring-tipo-institucional", ponto: "bg-tipo-institucional" },
  visita_tecnica: { texto: "text-tipo-visita-tecnica", fundo: "bg-tipo-visita-tecnica-suave", contorno: "ring-tipo-visita-tecnica", ponto: "bg-tipo-visita-tecnica" },
  atendimento: { texto: "text-tipo-atendimento", fundo: "bg-tipo-atendimento-suave", contorno: "ring-tipo-atendimento", ponto: "bg-tipo-atendimento" },
  administrativo: { texto: "text-tipo-administrativo", fundo: "bg-tipo-administrativo-suave", contorno: "ring-tipo-administrativo", ponto: "bg-tipo-administrativo" },
  outro: { texto: "text-tipo-outro", fundo: "bg-tipo-outro-suave", contorno: "ring-tipo-outro", ponto: "bg-tipo-outro" },
};

export const TIPO_DO_EVENTO: Record<TipoEvento, TipoLegenda> = { reuniao: "reuniao", viagem: "viagem", compromisso: "compromisso" };

export const TIPO_DO_ESPACO: Record<TipoEventoEspaco, TipoLegenda> = {
  reuniao: "reuniao",
  curso: "capacitacao",
  palestra: "palestra",
  institucional: "institucional",
  outro: "outro",
};

export const TIPO_DA_ATIVIDADE: Record<TipoAtividade, TipoLegenda> = {
  visita_tecnica: "visita_tecnica",
  atendimento: "atendimento",
  reuniao: "reuniao",
  capacitacao: "capacitacao",
  evento: "institucional",
  viagem: "viagem",
  administrativo: "administrativo",
  outro: "outro",
};

export function tipoDoEvento(e: Pick<Evento, "tipo" | "tipoNaLegenda">): TipoLegenda {
  return e.tipoNaLegenda ?? TIPO_DO_EVENTO[e.tipo];
}

/** Os tipos que aparecem na tela, sem repetir e na ordem do catálogo (a legenda mostra só esses). */
export function tiposPresentes(tipos: Iterable<TipoLegenda>): TipoLegenda[] {
  const ha = new Set(tipos);
  return ORDEM.filter((t) => ha.has(t));
}
