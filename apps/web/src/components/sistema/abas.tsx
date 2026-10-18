"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Aba {
  id: string;
  rotulo: string;
  conteudo: ReactNode;
}

/** Abas acessíveis (setas trocam de aba) com a aba ativa no ?aba= da URL, para o link reproduzir a tela. */
/** `tour`: marca a lista de abas para o tour guiado destacar. */
export function Abas({ abas, rotulo, base, tour }: { abas: Aba[]; rotulo: string; base: string; tour?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const lista = useRef<HTMLDivElement>(null);
  const ativa = abas.find((a) => a.id === params.get("aba")) ?? abas[0]!;

  function ir(id: string, focar = false) {
    router.replace(`${base}?aba=${id}`, { scroll: false });
    if (focar) requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>(`#aba-${id}`)?.focus());
  }

  return (
    <div>
      <div
        ref={lista}
        role="tablist"
        data-tour={tour}
        aria-label={rotulo}
        className="flex flex-wrap gap-1 border-b border-line"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = abas.findIndex((a) => a.id === ativa.id);
          const prox = abas[(i + (e.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length]!;
          ir(prox.id, true);
        }}
      >
        {abas.map((a) => (
          <button
            key={a.id}
            id={`aba-${a.id}`}
            type="button"
            role="tab"
            aria-selected={a.id === ativa.id}
            aria-controls={`painel-${a.id}`}
            tabIndex={a.id === ativa.id ? 0 : -1}
            onClick={() => ir(a.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              a.id === ativa.id ? "border-brand text-brand-strong" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div id={`painel-${ativa.id}`} role="tabpanel" aria-labelledby={`aba-${ativa.id}`} className="pt-5">
        {ativa.conteudo}
      </div>
    </div>
  );
}
