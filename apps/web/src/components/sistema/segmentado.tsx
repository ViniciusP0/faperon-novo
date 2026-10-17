"use client";

import { cn } from "@/lib/utils";

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

/** Controle segmentado em vidro: trilho translúcido, opção ativa em vidro verde. */
export function Segmentado<T extends string>({ rotulo, opcoes, valor, aoMudar }: { rotulo: string; opcoes: Opcao<T>[]; valor: T; aoMudar: (v: T) => void }) {
  return (
    <div role="group" aria-label={rotulo} className="vidro-trilho inline-flex rounded-xl p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => aoMudar(o.valor)}
          className={cn(
            "rounded-[10px] px-3.5 py-1.5 text-sm font-medium transition duration-150 ease-out",
            valor === o.valor ? "vidro-primario" : "text-ink-muted hover:bg-white/50 hover:text-ink dark:hover:bg-white/5",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
