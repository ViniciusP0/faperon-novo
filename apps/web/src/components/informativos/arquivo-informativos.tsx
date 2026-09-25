"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";
import type { Categoria } from "@/content/informativos";
import { formatDataCurta } from "@/lib/format";
import { agruparPorAno, anosDisponiveis } from "@/lib/informativos";
import { cn } from "@/lib/utils";

/** Arquivo dos informativos mensais: abas por categoria e filtro por ano. */
export function ArquivoInformativos({ categorias }: { categorias: Categoria[] }) {
  const base = useId();
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const [categoriaId, setCategoriaId] = useState(categorias[0]!.id);
  const [ano, setAno] = useState<number | null>(null);

  const categoria = categorias.find((c) => c.id === categoriaId) ?? categorias[0]!;
  const anos = anosDisponiveis(categoria.itens);
  const grupos = agruparPorAno(categoria.itens, ano ?? undefined);

  function escolherCategoria(id: Categoria["id"]) {
    setCategoriaId(id);
    setAno(null);
  }

  /** Padrão APG de abas: setas, Home e End movem o foco e a seleção. */
  function aoTeclar(e: KeyboardEvent, indice: number) {
    const ultimo = categorias.length - 1;
    const destino =
      e.key === "ArrowRight" ? (indice === ultimo ? 0 : indice + 1)
      : e.key === "ArrowLeft" ? (indice === 0 ? ultimo : indice - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? ultimo
      : null;
    if (destino === null) return;
    e.preventDefault();
    escolherCategoria(categorias[destino]!.id);
    abas.current[destino]?.focus();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-5 border-b border-line">
        <div role="tablist" aria-label="Categoria" className="flex">
          {categorias.map((c, i) => (
            <button
              key={c.id}
              ref={(el) => {
                abas.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-label={c.titulo}
              tabIndex={c.id === categoria.id ? 0 : -1}
              onKeyDown={(e) => aoTeclar(e, i)}
              id={`${base}-aba-${c.id}`}
              aria-selected={c.id === categoria.id}
              aria-controls={`${base}-painel`}
              onClick={() => escolherCategoria(c.id)}
              className={cn(
                "border-b-[3px] border-transparent px-4 py-3 text-[0.95rem] font-medium text-ink-muted hover:text-brand",
                c.id === categoria.id && "border-brand-light text-brand",
              )}
            >
              {c.curto}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Filtrar por ano" className="flex gap-2 pb-2">
          {[null, ...anos].map((a) => (
            <button
              key={a ?? "todos"}
              type="button"
              aria-pressed={a === ano}
              onClick={() => setAno(a)}
              className={cn(
                "rounded-full border border-line bg-white px-3.5 py-1.5 text-[0.85rem] font-medium text-ink-muted hover:border-brand",
                a === ano && "border-brand bg-brand text-white hover:border-brand",
              )}
            >
              {a ?? "Todos"}
            </button>
          ))}
        </div>
      </div>

      <div id={`${base}-painel`} role="tabpanel" aria-labelledby={`${base}-aba-${categoria.id}`}>
        {grupos.map((g) => (
          <div key={g.ano}>
            <h3 className="pb-2 pt-6 text-[0.8rem] font-semibold uppercase tracking-wider text-ink-muted">{g.ano}</h3>
            <ul className="grid gap-x-10 md:grid-cols-2">
              {g.itens.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${categoria.titulo}, ${item.titulo} (PDF, abre em nova aba)`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3.5 border-b border-line px-1 py-3 hover:bg-surface-alt"
                  >
                    <span className="font-medium">{item.titulo}</span>
                    <time dateTime={item.data} className="text-sm text-ink-muted">
                      {formatDataCurta(item.data)}
                    </time>
                    <span aria-hidden="true" className="rounded border border-brand px-1.5 text-[0.7rem] font-bold text-brand">
                      PDF
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {grupos.length === 0 && <p className="py-6 text-ink-muted">Nenhum informativo neste ano.</p>}
      </div>
    </div>
  );
}
