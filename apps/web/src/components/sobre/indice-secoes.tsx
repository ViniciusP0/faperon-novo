"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface SecaoIndice {
  id: string;
  titulo: string;
}

/** Índice fixo da página: coluna lateral no desktop, barra rolável no celular. A seção visível fica marcada. */
export function IndiceSecoes({ secoes }: { secoes: SecaoIndice[] }) {
  const [ativa, setAtiva] = useState(secoes[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.find((e) => e.isIntersecting);
        if (visivel) setAtiva(visivel.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    for (const { id } of secoes) {
      const el = document.getElementById(id);
      if (el) observador.observe(el);
    }
    return () => observador.disconnect();
  }, [secoes]);

  return (
    <nav
      aria-label="Nesta página"
      className="sticky top-[72px] z-20 min-w-0 border-b border-line bg-white py-2 lg:top-24 lg:self-start lg:border-0 lg:bg-transparent lg:pt-[4.5rem]"
    >
      <h2 className="mb-3 hidden text-xs font-semibold uppercase tracking-wider text-ink-muted lg:block">Nesta página</h2>
      <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0 lg:border-l lg:border-line">
        {secoes.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={ativa === s.id ? "true" : undefined}
              className={cn(
                "block whitespace-nowrap border-b-[3px] border-transparent px-3 py-2 text-sm font-medium text-ink-muted hover:text-brand lg:-ml-px lg:border-b-0 lg:border-l-[3px] lg:px-3.5",
                ativa === s.id && "border-brand-light text-brand",
              )}
            >
              {s.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
