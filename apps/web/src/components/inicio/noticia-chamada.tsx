import { ExternalLink } from "lucide-react";
import Image from "next/image";
import type { Noticia } from "@/content/noticias";
import { formatData } from "@/lib/format";

/** Cartão de notícia. `mostrarCategorias` (página de notícias) acrescenta as etiquetas de categoria; no Início fica desligado. */
export function NoticiaChamada({ noticia, mostrarCategorias = false }: { noticia: Noticia; mostrarCategorias?: boolean }) {
  const corpo = (
    <>
      <div className="relative aspect-[3/2] overflow-hidden rounded bg-brand-soft">
        {noticia.imagem ? (
          <Image src={noticia.imagem} alt="" fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(min-width: 768px) 33vw, 100vw" />
        ) : (
          <Image src="/marca-faperon.png" alt="" width={96} height={96} className="absolute inset-0 m-auto h-24 w-24 opacity-60" />
        )}
      </div>
      <h3 className="mt-3.5 text-lg font-semibold leading-snug group-hover:text-brand-fg group-hover:underline">
        {noticia.titulo}
        {noticia.url_original && <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />}
      </h3>
      <time dateTime={noticia.data} className="mt-2 block text-sm text-ink-muted">
        {formatData(noticia.data)}
      </time>
      {mostrarCategorias && noticia.categorias.length > 0 && (
        <ul data-testid="categorias" className="mt-2 flex flex-wrap gap-1.5">
          {noticia.categorias.map((nome) => (
            <li key={nome} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
              {nome}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return noticia.url_original ? (
    <a href={noticia.url_original} target="_blank" rel="noopener noreferrer" className="group block">
      {corpo}
      <span className="sr-only">(abre no site atual em nova aba)</span>
    </a>
  ) : (
    <article className="group">{corpo}</article>
  );
}
