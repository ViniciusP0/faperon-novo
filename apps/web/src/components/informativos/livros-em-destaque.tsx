"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { formatData } from "@/lib/format";
import type { LivroInfo } from "@/lib/informativos";
import { cn } from "@/lib/utils";
import { Livro } from "./livro";
import { PreviaInformativo } from "./previa-informativo";

const verbo = (l: LivroInfo) => (l.tipo === "boletim" ? l.titulo : `${l.categoria} – ${l.titulo}`);

/** Últimas edições de cada categoria, com o livro em destaque, pré-visualização e download. */
export function UltimasEdicoes({ edicoes }: { edicoes: LivroInfo[] }) {
  const [aberto, setAberto] = useState<LivroInfo | null>(null);
  return (
    <>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        {edicoes.map((l) => (
          <article
            key={l.url}
            className="livro-gatilho grid items-center gap-8 rounded-[18px] border border-line bg-surface-alt py-8 pl-11 pr-8 [perspective:1200px] sm:grid-cols-[auto_1fr] max-sm:justify-items-center max-sm:px-8 max-sm:text-center"
          >
            <Livro livro={l} tamanho="lg" className="mx-1 my-1.5" />
            <div>
              <span className="mb-2 inline-block rounded-full bg-brand-lime px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-brand-dark">Novo</span>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-fg">{l.categoria}</p>
              <h3 className="mt-1.5 text-[1.3rem] font-semibold leading-tight">Informativo Mensal, {l.titulo}</h3>
              <p className="mt-1.5 text-[0.95rem] text-ink-muted">
                Publicado em <time dateTime={l.data}>{formatData(l.data)}</time>
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5 max-sm:justify-center">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Pré-visualizar ${verbo(l)}`}
                  onClick={() => setAberto(l)}
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Pré-visualizar
                </button>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Baixar informativo ${l.titulo} – ${l.categoria} (PDF, abre em nova aba)`}
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Baixar
                  <span aria-hidden="true" className="rounded bg-white/20 px-1.5 text-[0.7rem] font-bold">
                    PDF
                  </span>
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <PreviaInformativo livro={aberto} onFechar={() => setAberto(null)} />
    </>
  );
}

/** Boletins técnicos como livros dourados; cada um abre a pré-visualização. */
export function BoletinsEmLivros({ boletins }: { boletins: LivroInfo[] }) {
  const [aberto, setAberto] = useState<LivroInfo | null>(null);
  return (
    <>
      <ul className="mt-7 grid gap-6 lg:grid-cols-2">
        {boletins.map((b) => (
          <li key={b.url}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Pré-visualizar ${b.titulo}`}
              onClick={() => setAberto(b)}
              className="livro-gatilho grid w-full items-center gap-7 rounded-2xl border border-line bg-card py-7 pl-9 pr-8 text-left [perspective:1200px] sm:grid-cols-[auto_1fr]"
            >
              <Livro livro={b} tamanho="sm" />
              <span>
                <span className="block text-[1.1rem] font-semibold leading-snug">{b.titulo}</span>
                <span className="mt-1 block text-sm text-ink-muted">
                  Publicado em <time dateTime={b.data}>{formatData(b.data)}</time>
                </span>
                <span className="mt-3 block text-sm font-semibold text-brand-fg">
                  Pré-visualizar <span aria-hidden="true">→</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <PreviaInformativo livro={aberto} onFechar={() => setAberto(null)} />
    </>
  );
}
