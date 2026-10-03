import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Icone } from "@/components/site/icone";
import { buttonVariants } from "@/components/ui/button";
import { CENTRAL as c } from "@/content/central";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: "/central-de-inteligencia" },
};

export default function CentralPage() {
  return (
    <>
      <section aria-labelledby="central-titulo" className="bg-gradient-to-br from-brand-dark to-brand text-white">
        <div className="container grid gap-4 py-14 md:py-20">
          <h1 id="central-titulo" className="text-3xl font-bold md:text-5xl">
            {c.titulo}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-white/90">{c.subtitulo}</p>
          <div className="pt-2">
            <Link href={c.cta_url} className={cn(buttonVariants({ variant: "light", size: "lg" }))}>
              {c.cta_texto}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container mt-12 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="prose-faperon max-w-none text-ink">
          {c.paragrafos.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <aside aria-label="O que você encontra no painel" className="rounded-2xl bg-brand-soft p-6">
          <h2 className="text-lg font-semibold text-brand-strong">No Painel Agro Analítico</h2>
          <ul className="mt-4 space-y-4">
            {c.blocos.map((b) => (
              <li key={b.titulo} className="flex gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                  <Icone nome={b.icone} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{b.titulo}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{b.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="container mt-12">
        <div className="rounded-2xl border border-line p-8 text-center">
          <h2 className="text-2xl font-semibold">Pronto para explorar os dados?</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-muted">
            Escolha um produto, um indicador e um período. O link da sua consulta pode ser compartilhado.
          </p>
          <Link href={c.cta_url} className={cn(buttonVariants({ size: "lg" }), "mt-5")}>
            {c.cta_texto}
          </Link>
        </div>
      </section>
    </>
  );
}
