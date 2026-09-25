import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Chamada {
  titulo: string;
  texto: string;
  rotulo: string;
  href: string;
  externo?: boolean;
}

function Acao({ c, className }: { c: Chamada; className: string }) {
  if (c.externo)
    return (
      <a href={c.href} target="_blank" rel="noopener noreferrer" className={className}>
        {c.rotulo}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    );
  return (
    <Link href={c.href} className={className}>
      {c.rotulo}
    </Link>
  );
}

/** Rodapé de página em duas metades: chamada escura à esquerda, chamada em azul-aço claro à direita. */
export function CtaDuplo({ principal, secundaria }: { principal: Chamada; secundaria: Chamada }) {
  return (
    <div className="mt-16 grid lg:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="cta-principal" className="bg-brand-dark px-4 py-12 text-white lg:pl-[max(1rem,calc((100vw-1200px)/2+1rem))] lg:pr-14">
        <h2 id="cta-principal" className="max-w-[20ch] text-3xl font-semibold leading-tight tracking-tight">
          {principal.titulo}
        </h2>
        <p className="mt-3 max-w-[46ch] text-[#cfe6da]">{principal.texto}</p>
        <Acao
          c={principal}
          className={cn(buttonVariants({ size: "lg" }), "mt-6 bg-brand-lime text-[#003329] hover:bg-[#9bdc60] focus-visible:outline-white")}
        />
      </section>
      <aside aria-labelledby="cta-secundaria" className="bg-[#e4edf3] px-4 py-12 lg:pl-14 lg:pr-[max(1rem,calc((100vw-1200px)/2+1rem))]">
        <h2 id="cta-secundaria" className="text-[1.4rem] font-semibold">
          {secundaria.titulo}
        </h2>
        <p className="mt-2.5 max-w-[42ch] text-ink-muted">{secundaria.texto}</p>
        <Acao
          c={secundaria}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-5 border-2 border-steel text-steel hover:bg-steel hover:text-white",
          )}
        />
      </aside>
    </div>
  );
}
