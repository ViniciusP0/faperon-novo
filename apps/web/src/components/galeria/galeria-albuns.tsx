"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Images, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CATEGORIAS_GALERIA, filtrarAlbuns, totalDeFotos, type AlbumGaleria, type CategoriaGaleria } from "@/content/galeria";
import { formatDataCurta } from "@/lib/format";
import { cn } from "@/lib/utils";

const chip = "inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors";
const botaoRedondo = "flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 focus-visible:outline-white";

/** Álbuns por evento com filtro FAPERON / SENAR e visualização ampliada, navegável por teclado. */
export function GaleriaAlbuns({ albuns }: { albuns: AlbumGaleria[] }) {
  const [categoria, setCategoria] = useState<CategoriaGaleria | null>(null);
  const [aberto, setAberto] = useState<{ album: AlbumGaleria; foto: number } | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  const visiveis = filtrarAlbuns(albuns, categoria);
  const opcoes: { valor: CategoriaGaleria | null; nome: string; total: number }[] = [
    { valor: null, nome: "Todos", total: albuns.length },
    ...(Object.keys(CATEGORIAS_GALERIA) as CategoriaGaleria[]).map((c) => ({ valor: c, nome: CATEGORIAS_GALERIA[c], total: filtrarAlbuns(albuns, c).length })),
  ];

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  const ir = useCallback((passo: number) => {
    setAberto((atual) => {
      if (!atual) return atual;
      const n = atual.album.fotos.length;
      return { ...atual, foto: (atual.foto + passo + n) % n };
    });
  }, []);

  const aoTeclar = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") ir(1);
    else if (e.key === "ArrowLeft") ir(-1);
  };

  const atual = aberto ? aberto.album.fotos[aberto.foto] : null;

  return (
    <div>
      <nav aria-label="Filtrar por entidade">
        <ul className="flex flex-wrap gap-2">
          {opcoes.map((o) => {
            const selecionado = o.valor === categoria;
            return (
              <li key={o.valor ?? "todos"}>
                <button
                  type="button"
                  aria-pressed={selecionado}
                  onClick={() => setCategoria(o.valor)}
                  className={cn(
                    chip,
                    selecionado
                      ? "border-brand bg-brand text-white dark:border-brand-lime dark:bg-brand-lime dark:text-brand-dark"
                      : "border-line bg-card text-ink hover:border-brand-fg hover:text-brand-fg",
                  )}
                >
                  {o.nome} ({o.total})
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <p role="status" aria-live="polite" className="mt-5 text-sm text-ink-muted">
        {visiveis.length} {visiveis.length === 1 ? "evento" : "eventos"}, {totalDeFotos(visiveis)} fotos
        {categoria ? ` de ${CATEGORIAS_GALERIA[categoria]}` : ""}
      </p>

      <ul className="mt-6 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((album) => (
          <li key={album.slug}>
            <button
              type="button"
              onClick={() => setAberto({ album, foto: 0 })}
              className="group block w-full text-left"
              aria-label={`Abrir álbum: ${album.titulo}, ${album.fotos.length} fotos`}
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={album.fotos[0]!.miniatura}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{CATEGORIAS_GALERIA[album.categoria]}</span>
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white">
                  <Images aria-hidden="true" className="h-3.5 w-3.5" />
                  {album.fotos.length}
                </span>
              </span>
              <span className="mt-3 block text-xs font-medium text-ink-muted">{formatDataCurta(album.data)}</span>
              <span className="mt-1 block text-base font-semibold leading-snug text-ink group-hover:text-brand-fg">{album.titulo}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogo}
        aria-label={aberto ? `Álbum: ${aberto.album.titulo}` : "Álbum"}
        onClose={() => setAberto(null)}
        onKeyDown={aoTeclar}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAberto(null);
        }}
        className="m-auto h-[100dvh] w-screen max-h-none max-w-none bg-black/90 p-0 text-white backdrop:bg-black/80 sm:h-[92vh] sm:w-[min(96vw,72rem)] sm:rounded-2xl"
      >
        {aberto && atual && (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-xs text-white/80">
                  {CATEGORIAS_GALERIA[aberto.album.categoria]} · {formatDataCurta(aberto.album.data)}
                </p>
                <h2 className="mt-0.5 text-base font-semibold leading-snug sm:text-lg">{aberto.album.titulo}</h2>
              </div>
              <button type="button" onClick={() => setAberto(null)} aria-label="Fechar álbum" className={botaoRedondo}>
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={atual.src}
                src={atual.src}
                alt={`${aberto.album.titulo}, foto ${aberto.foto + 1} de ${aberto.album.fotos.length}`}
                width={atual.largura}
                height={atual.altura}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
              {aberto.album.fotos.length > 1 && (
                <>
                  <button type="button" onClick={() => ir(-1)} aria-label="Foto anterior" className={cn(botaoRedondo, "absolute left-2 top-1/2 -translate-y-1/2")}>
                    <ChevronLeft aria-hidden="true" className="h-6 w-6" />
                  </button>
                  <button type="button" onClick={() => ir(1)} aria-label="Próxima foto" className={cn(botaoRedondo, "absolute right-2 top-1/2 -translate-y-1/2")}>
                    <ChevronRight aria-hidden="true" className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <p aria-live="polite">
                Foto {aberto.foto + 1} de {aberto.album.fotos.length}
              </p>
              <a href={aberto.album.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-white underline underline-offset-4 hover:no-underline">
                Ler a matéria completa
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
