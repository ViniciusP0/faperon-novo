import Link from "next/link";
import type { ReactNode } from "react";

/** Abertura das páginas institucionais: trilha de navegação, manchete e texto de apoio. */
export function HeroPagina({
  atual,
  id,
  titulo,
  children,
}: {
  atual: string;
  id: string;
  titulo: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="container">
        <nav aria-label="Você está em" className="pt-5 text-[0.8rem] font-medium text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="text-brand hover:underline">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{atual}</li>
          </ol>
        </nav>
        <div className="grid items-end gap-7 pb-12 pt-9 lg:grid-cols-[1.55fr_1fr] lg:gap-16">
          <h1 id={id} className="text-[clamp(1.9rem,4.1vw,3.1rem)] font-semibold leading-[1.16] tracking-tight text-ink">
            {titulo}
          </h1>
          {children && <div className="max-w-[42ch] text-ink-muted [&_p]:leading-relaxed">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/** Trecho da manchete em destaque (verde e negrito). */
export function Destaque({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-brand">{children}</strong>;
}
