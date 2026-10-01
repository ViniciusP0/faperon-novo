import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ImagemHero {
  src: string;
  /** Posição do recorte, no formato do `object-position` (ex.: "50% 68%"). */
  posicao: string;
}

/** Abertura das páginas institucionais: trilha de navegação, manchete e texto de apoio. Com `imagem`, vira um Hero com foto de fundo. */
export function HeroPagina({
  atual,
  id,
  titulo,
  children,
  imagem,
}: {
  atual: string;
  id: string;
  titulo: ReactNode;
  children?: ReactNode;
  imagem?: ImagemHero;
}) {
  const comFoto = Boolean(imagem);
  return (
    <section aria-labelledby={id} className={cn(comFoto && "relative overflow-hidden bg-brand-dark text-white")}>
      {imagem && (
        <>
          <Image src={imagem.src} alt="" fill priority unoptimized sizes="100vw" className="object-cover" style={{ objectPosition: imagem.posicao }} />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-brand-dark/88 md:bg-transparent md:[background-image:linear-gradient(90deg,rgba(0,70,58,.94)_0%,rgba(0,70,58,.78)_38%,rgba(0,70,58,.12)_72%,rgba(0,70,58,0)_100%)]"
          />
        </>
      )}
      <div className={cn("container", comFoto && "relative")}>
        <nav aria-label="Você está em" className={cn("pt-5 text-[0.8rem] font-medium", comFoto ? "pt-14 text-white/85" : "text-ink-muted")}>
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className={cn("hover:underline", comFoto ? "text-white underline underline-offset-4" : "text-brand")}>
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{atual}</li>
          </ol>
        </nav>
        <div className={cn("grid items-end gap-7 pb-12 pt-9 lg:grid-cols-[1.55fr_1fr] lg:gap-16", comFoto && "pb-24 lg:grid-cols-[minmax(0,40rem)] lg:gap-5")}>
          <h1
            id={id}
            className={cn(
              "text-[clamp(1.9rem,4.1vw,3.1rem)] font-semibold leading-[1.16] tracking-tight",
              comFoto ? "text-white [&_strong]:text-brand-lime" : "text-ink",
            )}
          >
            {titulo}
          </h1>
          {children && <div className={cn("max-w-[48ch] [&_p]:leading-relaxed", comFoto ? "text-white/92" : "text-ink-muted")}>{children}</div>}
        </div>
      </div>
    </section>
  );
}

/** Trecho da manchete em destaque (verde e negrito). */
export function Destaque({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-brand">{children}</strong>;
}
