import { ExternalLink } from "lucide-react";
import Image from "next/image";
import type { Noticia } from "@/content/noticias";
import { formatData } from "@/lib/format";

export function NoticiaChamada({ noticia }: { noticia: Noticia }) {
  const corpo = (
    <>
      <div className="relative aspect-[3/2] overflow-hidden rounded bg-brand-soft">
        {noticia.imagem ? (
          <Image src={noticia.imagem} alt="" fill unoptimized className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
        ) : (
          <Image src="/marca-faperon.png" alt="" width={96} height={96} className="absolute inset-0 m-auto h-24 w-24 opacity-60" />
        )}
      </div>
      <h3 className="mt-3.5 text-lg font-semibold leading-snug group-hover:text-brand group-hover:underline">
        {noticia.titulo}
        {noticia.url_original && <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />}
      </h3>
      <time dateTime={noticia.data} className="mt-2 block text-sm text-ink-muted">
        {formatData(noticia.data)}
      </time>
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
