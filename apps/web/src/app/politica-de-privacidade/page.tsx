import type { Metadata } from "next";
import Link from "next/link";
import { HeroPagina } from "@/components/site/hero-pagina";
import { PRIVACIDADE as c } from "@/content/privacidade";
import { formatData } from "@/lib/format";
import { ROTAS } from "@/lib/site";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: ROTAS.privacidade },
};

export default function PoliticaDePrivacidadePage() {
  return (
    <>
      <HeroPagina id="privacidade-titulo" atual="Política de Privacidade" titulo={c.titulo}>
        <p>
          Última atualização: <time dateTime={c.atualizadoEm}>{formatData(c.atualizadoEm)}</time>
        </p>
      </HeroPagina>

      <div className="border-t-2 border-ink">
        <div className="container max-w-3xl pt-14">
          <p className="leading-relaxed text-ink-muted">{c.introducao}</p>
          {c.secoes.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="mt-10 scroll-mt-32">
              <h2 id={`${s.id}-titulo`} className="text-[1.4rem] font-semibold tracking-tight">
                {s.titulo}
              </h2>
              {s.paragrafos?.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-ink-muted">
                  {p}
                </p>
              ))}
              {s.itens && (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-ink-muted">
                  {s.itens.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="mt-10">
            <Link href={ROTAS.faleConosco} className="font-medium text-brand-fg underline underline-offset-2 hover:no-underline">
              Ir para Fale Conosco
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
