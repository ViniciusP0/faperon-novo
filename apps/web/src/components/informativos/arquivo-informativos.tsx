"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";
import type { Categoria } from "@/content/informativos";
import { formatDataCurta } from "@/lib/format";
import { agruparPorAno, anosDisponiveis, type LivroInfo, livroDoInformativo } from "@/lib/informativos";
import { cn } from "@/lib/utils";
import { Livro } from "./livro";
import { PreviaInformativo } from "./previa-informativo";

type Vista = "capas" | "lombadas" | "lista";

const VISTAS: { id: Vista; rotulo: string }[] = [
  { id: "capas", rotulo: "Capas" },
  { id: "lombadas", rotulo: "Lombadas" },
  { id: "lista", rotulo: "Lista" },
];

const chip = "rounded-full border border-line bg-card px-3.5 py-1.5 text-[0.85rem] font-medium text-ink-muted hover:border-brand-fg";
const chipAtivo = "border-brand bg-brand text-white hover:border-brand-fg";

/** Estante dos informativos mensais: abas por categoria, filtro por ano e três formas de ver (capas, lombadas e lista). */
export function ArquivoInformativos({ categorias }: { categorias: Categoria[] }) {
  const base = useId();
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const [categoriaId, setCategoriaId] = useState(categorias[0]!.id);
  const [ano, setAno] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>("capas");
  const [aberto, setAberto] = useState<LivroInfo | null>(null);

  const categoria = categorias.find((c) => c.id === categoriaId) ?? categorias[0]!;
  const anos = anosDisponiveis(categoria.itens);
  const grupos = agruparPorAno(categoria.itens, ano ?? undefined);
  const livros = categoria.itens.map((i) => livroDoInformativo(i, categoria));
  const indiceAberto = aberto ? livros.findIndex((l) => l.url === aberto.url) : -1;

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

  const rotuloItem = (titulo: string) => `${categoria.titulo}, ${titulo}. Pré-visualizar`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 border-b border-line">
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
                "border-b-[3px] border-transparent px-4 py-3 text-[0.95rem] font-medium text-ink-muted hover:text-brand-fg",
                c.id === categoria.id && "border-brand-light text-brand-fg",
              )}
            >
              {c.curto}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-2">
          <div role="group" aria-label="Filtrar por ano" className="flex gap-2">
            {[null, ...anos].map((a) => (
              <button key={a ?? "todos"} type="button" aria-pressed={a === ano} onClick={() => setAno(a)} className={cn(chip, a === ano && chipAtivo)}>
                {a ?? "Todos"}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Forma de visualizar" className="flex overflow-hidden rounded-[10px] border border-line">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v.id === vista}
                onClick={() => setVista(v.id)}
                className={cn("bg-card px-3 py-1.5 text-[0.82rem] font-medium text-ink-muted hover:text-brand-fg", v.id === vista && "bg-brand-soft text-brand-fg")}
              >
                {v.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id={`${base}-painel`} role="tabpanel" aria-labelledby={`${base}-aba-${categoria.id}`}>
        {grupos.map((g) => (
          <div key={g.ano}>
            <h3 className="flex items-center gap-3 pb-2 pt-8 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-ink-muted after:h-px after:flex-1 after:bg-line">
              {g.ano}
            </h3>

            {vista === "capas" && (
              <ul className="grid grid-cols-2 gap-x-4 [perspective:1400px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {g.itens.map((item) => {
                  const livro = livroDoInformativo(item, categoria);
                  return (
                    <li key={item.url} className="relative isolate">
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={rotuloItem(item.titulo)}
                        onClick={() => setAberto(livro)}
                        className="livro-gatilho flex w-full flex-col items-center pt-6 text-center"
                      >
                        <span className="flex h-[236px] w-full items-end justify-center">
                          <Livro livro={livro} tamanho="sm" />
                        </span>
                        <span aria-hidden="true" className="absolute inset-x-[-0.5rem] top-[262px] -z-10 h-3 rounded-b bg-gradient-to-b from-[#e7e1d3] to-[#cfc7b3] shadow-[0_8px_14px_-6px_rgba(0,0,0,0.25)]" />
                        <span className="mt-6 text-[0.92rem] font-semibold">{item.titulo}</span>
                        <span className="text-[0.78rem] text-ink-muted">{formatDataCurta(item.data)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {vista === "lombadas" && (
              <>
                <ul className="flex items-end gap-1 overflow-x-auto rounded-t-2xl border border-b-0 border-line bg-gradient-to-b from-white to-surface-alt px-6 pb-0 pt-8">
                  {g.itens.map((item, k) => {
                    const livro = livroDoInformativo(item, categoria);
                    return (
                      <li key={item.url} className="shrink-0">
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          aria-label={rotuloItem(item.titulo)}
                          onClick={() => setAberto(livro)}
                          style={{ height: 190 + ((k * 37) % 5) * 14 }}
                          className={cn(
                            "lombada-livro livro-tema-" + categoria.id,
                            "flex w-[46px] flex-col items-center justify-between rounded-t-[3px] py-3 text-white",
                          )}
                        >
                          <span aria-hidden="true" className="h-[3px] w-5 rounded-sm bg-[var(--acento)]" />
                          <span aria-hidden="true" className="text-[0.78rem] font-semibold tracking-[0.05em] [transform:rotate(180deg)] [white-space:nowrap] [writing-mode:vertical-rl]">
                            {item.titulo.replace("/", " · ")}
                          </span>
                          <span aria-hidden="true" className="h-[3px] w-5 rounded-sm bg-[var(--acento)]" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div aria-hidden="true" className="h-4 rounded-b-lg bg-gradient-to-b from-[#cfc7b3] to-[#b9b09a] shadow-[0_10px_16px_-8px_rgba(0,0,0,0.35)]" />
              </>
            )}

            {vista === "lista" && (
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
                      <span aria-hidden="true" className="rounded border border-brand-fg px-1.5 text-[0.7rem] font-bold text-brand-fg">
                        PDF
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {grupos.length === 0 && <p className="py-6 text-ink-muted">Nenhum informativo neste ano.</p>}
      </div>

      <PreviaInformativo
        livro={aberto}
        onFechar={() => setAberto(null)}
        onTrocar={setAberto}
        anterior={indiceAberto >= 0 ? livros[indiceAberto + 1] : undefined}
        proxima={indiceAberto > 0 ? livros[indiceAberto - 1] : undefined}
      />
    </div>
  );
}
