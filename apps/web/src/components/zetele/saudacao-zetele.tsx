"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { ZETELE } from "@/content/zetele";

export const CHAVE_SAUDACAO = "zetele-saudou";

/** Sem storage (aba privada, bloqueio) o balão aparece; o X continua fechando na página atual. */
function foiDispensada(): boolean {
  try {
    return window.sessionStorage.getItem(CHAVE_SAUDACAO) === "1";
  } catch {
    return false;
  }
}

export function marcarSaudou(): void {
  try {
    window.sessionStorage.setItem(CHAVE_SAUDACAO, "1");
  } catch {
    // sem storage: o balão volta na próxima página, o que é aceitável
  }
}

/** Balão fixo ao lado do Zétele: aparece ao carregar e fica até ser clicado ou fechado. */
export function SaudacaoZetele({ bloqueada, onAbrir }: { bloqueada: boolean; onAbrir: () => void }) {
  // começa escondido e decide no efeito: o sessionStorage não existe no servidor (evita erro de hidratação)
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    setVisivel(!bloqueada && !foiDispensada());
  }, [bloqueada]);

  function dispensar() {
    marcarSaudou();
    setVisivel(false);
  }

  if (!visivel) return null;
  return (
    <div
      role="status"
      className="zetele-balao mb-36 flex items-center gap-1 rounded-2xl rounded-br-sm border border-line bg-card py-1.5 pl-4 pr-1.5 text-sm text-ink shadow-lg"
    >
      <button
        type="button"
        onClick={() => {
          dispensar();
          onAbrir();
        }}
        className="font-medium text-brand-fg underline-offset-2 hover:underline"
      >
        {ZETELE.saudacao}
      </button>
      <button
        type="button"
        aria-label={ZETELE.rotuloFecharSaudacao}
        onClick={dispensar}
        className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
