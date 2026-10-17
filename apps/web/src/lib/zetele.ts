import type { PaginaComZetele } from "@/content/zetele";
import { API_BASE } from "./api";

export interface FonteZetele {
  rotulo: string;
  url_fonte: string;
  url_interna: string | null;
  atualizado_em: string | null;
}

export interface RespostaZetele {
  status: "respondida" | "recusada" | "erro";
  texto: string;
  fontes: FonteZetele[];
  sugestoes: string[];
}

export interface EstadoZetele {
  disponivel: boolean;
  motivo: string | null;
}

export interface MensagemHistorico {
  papel: "visitante" | "zetele";
  texto: string;
}

export type ResultadoPergunta =
  | { tipo: "ok"; resposta: RespostaZetele }
  | { tipo: "espera"; segundos: number }
  | { tipo: "indisponivel"; motivo: string }
  | { tipo: "falha" };

const BASE = `${API_BASE}/zetele`;
const MAX_HISTORICO = 6;

export async function obterEstado(): Promise<EstadoZetele> {
  try {
    const r = await fetch(`${BASE}/estado`, { cache: "no-store" });
    if (!r.ok) return { disponivel: false, motivo: "indisponivel" };
    return (await r.json()) as EstadoZetele;
  } catch {
    return { disponivel: false, motivo: "indisponivel" };
  }
}

export async function perguntar(
  pergunta: string,
  historico: MensagemHistorico[],
  pagina: PaginaComZetele,
): Promise<ResultadoPergunta> {
  try {
    const r = await fetch(`${BASE}/perguntar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pergunta, historico: historico.slice(-MAX_HISTORICO), pagina }),
    });
    if (r.ok) return { tipo: "ok", resposta: (await r.json()) as RespostaZetele };
    if (r.status === 429) return { tipo: "espera", segundos: Number.parseInt(r.headers.get("retry-after") ?? "", 10) || 30 };
    if (r.status === 503) {
      const corpo = (await r.json().catch(() => ({}))) as { motivo?: string };
      return { tipo: "indisponivel", motivo: corpo.motivo ?? "indisponivel" };
    }
    return { tipo: "falha" };
  } catch {
    return { tipo: "falha" };
  }
}

export type ParteTexto = { tipo: "texto"; texto: string } | { tipo: "link"; texto: string; href: string };

const RE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** O servidor já conferiu os links; aqui só se transforma Markdown em partes, aceitando rota interna ou https. */
export function partesDoTexto(texto: string): ParteTexto[] {
  const partes: ParteTexto[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(RE_LINK)) {
    const href = m[2]!;
    if (!href.startsWith("/") && !href.startsWith("https://")) continue;
    if (m.index! > ultimo) partes.push({ tipo: "texto", texto: texto.slice(ultimo, m.index) });
    partes.push({ tipo: "link", texto: m[1]!, href });
    ultimo = m.index! + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ tipo: "texto", texto: texto.slice(ultimo) });
  return partes;
}
