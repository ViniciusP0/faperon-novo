import type { Metadata } from "next";
import { CtaDuplo } from "@/components/site/cta-duplo";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { Fontes, NavSistema } from "@/components/sistema/nav-sistema";
import { MULHERES as c } from "@/content/comissao-mulheres";
import { Revelar } from "@/components/site/revelar";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: "/comissao-mulheres" },
};

const tituloSecao = "text-[1.75rem] font-semibold tracking-tight";

export default function ComissaoMulheresPage() {
  return (
    <>
      <HeroPagina
        id="mulheres-titulo"
        atual="Comissão Mulheres"
        imagem={{ src: "/noticias/caravana-do-sistema-faperon-senar-participa-do-6-congresso-m.jpg", posicao: "50% 35%" }}
        titulo={
          <>
            {c.hero.antes} <Destaque>{c.hero.forte}</Destaque> {c.hero.depois}
          </>
        }
      >
        <p>{c.hero.texto}</p>
      </HeroPagina>
      <NavSistema atual="Comissão Mulheres" />

      <div className="container grid gap-14 pt-14">
        <Revelar as="section" aria-labelledby="atuacao-titulo">
          <h2 id="atuacao-titulo" className={tituloSecao}>
            {c.atuacao.titulo}
          </h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {c.atuacao.itens.map((i) => (
              <li key={i.titulo} className="rounded-2xl border border-line border-t-4 border-t-brand-light bg-card p-6">
                <p className="text-lg font-semibold leading-snug">{i.titulo}</p>
                <p className="mt-2 leading-relaxed text-ink-muted">{i.texto}</p>
              </li>
            ))}
          </ul>
          <Fontes fontes={[c.atuacao.fonte]} />
        </Revelar>

        <Revelar as="section" aria-labelledby="lideranca-titulo" className="grid gap-6 rounded-2xl bg-surface-alt p-7 md:p-9 lg:grid-cols-[1fr_1.6fr] lg:gap-14">
          <h2 id="lideranca-titulo" className={tituloSecao}>
            {c.lideranca.titulo}
          </h2>
          <div>
            <p className="leading-relaxed">{c.lideranca.texto}</p>
            <Fontes fontes={[c.lideranca.fonte]} />
          </div>
        </Revelar>

        <Revelar as="section" aria-labelledby="nacional-titulo" className="rounded-2xl bg-brand-dark p-7 text-white md:p-10">
          <h2 id="nacional-titulo" className="text-3xl font-semibold tracking-tight">
            {c.nacional.titulo}
          </h2>
          <p className="mt-3 max-w-[66ch] leading-relaxed text-white/90">{c.nacional.texto}</p>
          <div className="mt-7 grid gap-8 lg:grid-cols-[auto_1fr] lg:gap-16">
            <ul className="flex gap-10">
              {c.nacional.numeros.map((n) => (
                <li key={n.rotulo}>
                  <p className="text-4xl font-bold tabular-nums text-brand-lime">{n.valor}</p>
                  <p className="mt-1 max-w-[16ch] text-sm text-white/85">{n.rotulo}</p>
                </li>
              ))}
            </ul>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/85">Linhas de atuação</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {c.nacional.linhas.map((l) => (
                  <li key={l} className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-sm text-white/80">
            Fonte:{" "}
            <a href={c.nacional.fonte.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline underline-offset-2 hover:no-underline">
              {c.nacional.fonte.rotulo}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </p>
        </Revelar>

        <Revelar as="section" aria-labelledby="linha-titulo">
          <h2 id="linha-titulo" className={tituloSecao}>
            {c.linhaDoTempo.titulo}
          </h2>
          <ol className="mt-8 grid gap-0 border-l-2 border-line pl-6 md:pl-8">
            {c.linhaDoTempo.itens.map((i) => (
              <li key={i.data + i.titulo} className="relative pb-9 last:pb-0">
                <span aria-hidden="true" className="absolute -left-[1.95rem] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-brand-fg bg-surface md:-left-[2.45rem]" />
                <p className="text-sm font-bold uppercase tracking-wider text-brand-fg">{i.data}</p>
                <h3 className="mt-1 text-xl font-semibold leading-snug">{i.titulo}</h3>
                <p className="mt-2 max-w-[72ch] leading-relaxed text-ink-muted">{i.texto}</p>
                <Fontes fontes={[i.fonte]} />
              </li>
            ))}
          </ol>
        </Revelar>
      </div>

      <CtaDuplo
        principal={{
          titulo: "Fale com a FAPERON",
          texto: "Quer levar uma ação da Comissão ao seu sindicato ou município? Envie sua mensagem pelos canais oficiais.",
          rotulo: "Ir para Fale Conosco",
          href: "/fale-conosco",
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
