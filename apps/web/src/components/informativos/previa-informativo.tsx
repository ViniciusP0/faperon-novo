"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { formatData } from "@/lib/format";
import type { LivroInfo } from "@/lib/informativos";
import { cn } from "@/lib/utils";
import { Livro } from "./livro";

interface PreviaProps {
  livro: LivroInfo | null;
  onFechar: () => void;
  /** Edições vizinhas, para folhear sem fechar a janela. */
  anterior?: LivroInfo;
  proxima?: LivroInfo;
  onTrocar?: (livro: LivroInfo) => void;
}

const botaoVizinho =
  "rounded-lg border border-line px-3 py-1 text-[0.8rem] text-ink-muted hover:border-brand disabled:opacity-40 disabled:hover:border-line";

/** Janela de pré-visualização: o livro girando, a ficha da edição e o botão de baixar o PDF. */
export function PreviaInformativo({ livro, onFechar, anterior, proxima, onTrocar }: PreviaProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (livro && !dialogo.open) {
      if (typeof dialogo.showModal === "function") dialogo.showModal();
      else dialogo.setAttribute("open", "");
    } else if (!livro && dialogo.open) {
      if (typeof dialogo.close === "function") dialogo.close();
      else dialogo.removeAttribute("open");
    }
  }, [livro]);

  const ehBoletim = livro?.tipo === "boletim";

  return (
    <dialog
      ref={ref}
      aria-labelledby="previa-titulo"
      onClose={onFechar}
      onClick={(e) => {
        if (e.target === ref.current) onFechar();
      }}
      className="m-auto w-[min(880px,calc(100%-2rem))] overflow-visible rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-[rgba(7,28,22,0.62)] backdrop:backdrop-blur-[3px]"
    >
      {livro && (
        <div className="relative grid min-h-[430px] md:grid-cols-2">
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar pré-visualização"
            className="absolute -right-2.5 -top-2.5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-lg ring-1 ring-black/10 hover:bg-brand-soft"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="vitrine-livro grid place-items-center overflow-hidden rounded-t-2xl bg-[radial-gradient(circle_at_50%_40%,#fff,var(--surface-alt)_70%)] px-5 py-8 [perspective:1400px] md:rounded-l-2xl md:rounded-tr-none">
            <Livro key={livro.url} livro={livro} tamanho="lg" />
          </div>
          <div className="flex flex-col p-7 md:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{ehBoletim ? "Boletim técnico" : "Informativo mensal"}</p>
            <h2 id="previa-titulo" className="mt-1.5 text-2xl font-semibold leading-tight">
              {ehBoletim ? livro.titulo : `${livro.categoria} – ${livro.titulo}`}
            </h2>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink-muted">Categoria</dt>
              <dd className="font-medium">{livro.categoria}</dd>
              <dt className="text-ink-muted">Publicado em</dt>
              <dd className="font-medium">
                <time dateTime={livro.data}>{formatData(livro.data)}</time>
              </dd>
              <dt className="text-ink-muted">Formato</dt>
              <dd className="font-medium">PDF, abre em nova aba</dd>
            </dl>
            {onTrocar && (anterior || proxima) && (
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  disabled={!anterior}
                  aria-label={anterior ? `Edição anterior: ${anterior.titulo}` : "Edição anterior"}
                  onClick={() => anterior && onTrocar(anterior)}
                  className={botaoVizinho}
                >
                  <span aria-hidden="true">← </span>
                  Edição anterior
                </button>
                <button
                  type="button"
                  disabled={!proxima}
                  aria-label={proxima ? `Próxima edição: ${proxima.titulo}` : "Próxima edição"}
                  onClick={() => proxima && onTrocar(proxima)}
                  className={botaoVizinho}
                >
                  Próxima edição
                  <span aria-hidden="true"> →</span>
                </button>
              </div>
            )}
            <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
              <a
                href={livro.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Baixar ${livro.titulo} – ${livro.categoria} (PDF, abre em nova aba)`}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Baixar
                <span aria-hidden="true" className="rounded bg-white/20 px-1.5 text-[0.7rem] font-bold">
                  PDF
                </span>
              </a>
              <button type="button" onClick={onFechar} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
