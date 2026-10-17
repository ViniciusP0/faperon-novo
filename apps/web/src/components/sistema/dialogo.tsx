"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Diálogo modal simples: foco no primeiro campo, Esc fecha, foco volta para quem abriu. */
export function Dialogo({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const alvo = caixa.current?.querySelector<HTMLElement>("input, select, textarea") ?? caixa.current?.querySelector<HTMLElement>("button");
    alvo?.focus();
    return () => anterior?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 backdrop-blur-[3px] sm:items-center sm:p-4">
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            aoFechar();
          }
        }}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="dialogo-titulo" className="text-lg font-semibold text-ink">
            {titulo}
          </h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
