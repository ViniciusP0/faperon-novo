import { ArrowUpRight, Check, Download, FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { CtaDuplo } from "@/components/site/cta-duplo";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { Fontes, NavSistema } from "@/components/sistema/nav-sistema";
import { buttonVariants } from "@/components/ui/button";
import { IPAGRO as c } from "@/content/ipagro";
import { cn } from "@/lib/utils";
import { Revelar } from "@/components/site/revelar";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: "/ipagro" },
};

const tituloSecao = "text-[1.75rem] font-semibold tracking-tight";

export default function IpagroPage() {
  const d = c.diagnostico;
  return (
    <>
      <HeroPagina
        id="ipagro-titulo"
        atual="IPAGRO"
        imagem={{ src: "/hero/campo-rondonia.jpg", posicao: "50% 60%" }}
        titulo={
          <>
            {c.hero.antes} <Destaque>{c.hero.forte}</Destaque> {c.hero.depois}
          </>
        }
      >
        <p>{c.hero.texto}</p>
      </HeroPagina>
      <NavSistema atual="IPAGRO" />

      <div className="container grid gap-14 pt-14">
        <Revelar as="section" aria-labelledby="ficha-titulo" className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
          <div>
            <h2 id="ficha-titulo" className={tituloSecao}>
              Ficha institucional
            </h2>
            <p className="mt-3 max-w-[40ch] leading-relaxed text-ink-muted">Dados do cadastro público do instituto.</p>
            <Fontes fontes={c.fichaFontes} />
          </div>
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {c.ficha.map((f, i) => (
              <div key={f.rotulo} className={cn("bg-card p-5", (i === 0 || i === c.ficha.length - 1) && "sm:col-span-2")}>
                <dt className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">{f.rotulo}</dt>
                <dd className="mt-1 font-medium leading-snug text-ink">{f.valor}</dd>
              </div>
            ))}
          </dl>
        </Revelar>

        <Revelar as="section" aria-labelledby="diagnostico-titulo" className="rounded-2xl bg-brand-dark p-7 text-white md:p-10">
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-lime">
            <FlaskConical aria-hidden="true" className="h-4 w-4" />
            {d.etiqueta}
          </p>
          <h2 id="diagnostico-titulo" className="mt-3 max-w-[24ch] text-3xl font-semibold leading-tight tracking-tight">
            {d.titulo}
          </h2>
          <p className="mt-3 max-w-[62ch] leading-relaxed text-white/90">{d.texto}</p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <ol className="grid gap-5">
              {d.linha.map((e) => (
                <li key={e.data} className="rounded-xl border border-white/15 bg-white/[0.06] p-5">
                  <p className="text-sm font-bold uppercase tracking-wider text-brand-lime">{e.data}</p>
                  <p className="mt-2 leading-relaxed text-white/95">{e.texto}</p>
                  <p className="mt-3 text-sm text-white/80">
                    Fonte:{" "}
                    <a href={e.fonte.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline underline-offset-2 hover:no-underline">
                      {e.fonte.rotulo}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </p>
                </li>
              ))}
            </ol>
            <div>
              <h3 className="text-lg font-semibold">O que o levantamento reúne</h3>
              <ul className="mt-4 grid gap-3">
                {d.levantou.map((i) => (
                  <li key={i} className="flex items-start gap-2.5 leading-snug">
                    <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-lime" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Revelar>

        <Revelar as="section" aria-labelledby="transparencia-titulo" className="rounded-2xl bg-steel-soft p-7 md:p-10">
          <h2 id="transparencia-titulo" className={tituloSecao}>
            {c.transparencia.titulo}
          </h2>
          <p className="mt-3 max-w-[66ch] leading-relaxed text-ink-muted">{c.transparencia.texto}</p>
          <div className="mt-7 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
            <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {c.transparencia.dados.map((d, i) => (
                <div key={d.rotulo} className={cn("bg-card p-4", i === c.transparencia.dados.length - 1 && "sm:col-span-2")}>
                  <dt className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">{d.rotulo}</dt>
                  <dd className="mt-1 font-medium leading-snug text-ink">{d.valor}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">Objeto</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{c.transparencia.objeto}</p>
              <div className="mt-auto flex flex-col items-start gap-3 pt-6">
                <a href={c.transparencia.arquivo.url} download={c.transparencia.arquivo.nome} className={cn(buttonVariants({ size: "lg" }))}>
                  <Download aria-hidden="true" className="h-5 w-5" />
                  {c.transparencia.arquivo.rotulo}
                </a>
                <p className="text-sm text-ink-muted">{c.transparencia.arquivo.tamanho}</p>
                <a
                  href={c.transparencia.portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-fg underline underline-offset-2 hover:no-underline"
                >
                  {c.transparencia.portal.rotulo}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </div>
            </div>
          </div>
        </Revelar>
      </div>

      <CtaDuplo
        principal={{
          titulo: "Central de Inteligência Agropecuária",
          texto: "Ranking dos municípios, série histórica, comparação, análise pronta e relatório em PDF, tudo em um painel.",
          rotulo: "Conheça a Central de Inteligência",
          href: "/central-de-inteligencia",
        }}
        secundaria={{
          titulo: "Encontre seu sindicato",
          texto: "Presidente, telefone, e-mail e endereço do Sindicato dos Produtores Rurais do seu município.",
          rotulo: "Ver os sindicatos rurais",
          href: "/sindicatos-rurais",
        }}
      />
    </>
  );
}
