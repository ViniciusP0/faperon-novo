import type { Metadata } from "next";
import { CtaDuplo } from "@/components/site/cta-duplo";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { ListaSindicatos } from "@/components/sistema/lista-sindicatos";
import { Fontes, NavSistema } from "@/components/sistema/nav-sistema";
import { SINDICATOS, SINDICATOS_TEXTO as c } from "@/content/sindicatos";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: "/sindicatos-rurais" },
};

const tituloSecao = "text-[1.75rem] font-semibold tracking-tight";

export default function SindicatosRuraisPage() {
  return (
    <>
      <HeroPagina
        id="sindicatos-titulo"
        atual="Sindicatos Rurais"
        imagem={{ src: "/hero/faperon.jpg", posicao: "50% 40%" }}
        titulo={
          <>
            {c.hero.antes} <Destaque>{c.hero.forte}</Destaque> {c.hero.depois}
          </>
        }
      >
        <p>{c.hero.texto}</p>
      </HeroPagina>
      <NavSistema atual="Sindicatos Rurais" />

      <div className="container grid gap-14 pt-14">
        <section aria-labelledby="lista-titulo">
          <h2 id="lista-titulo" className={tituloSecao}>
            Sindicatos dos Produtores Rurais
          </h2>
          <p className="mt-2 mb-8 max-w-[70ch] leading-relaxed text-ink-muted">
            Contatos conforme o cadastro publicado no site da FAPERON. Alguns sindicatos atendem mais de um município e aparecem com os dois nomes.
          </p>
          <ListaSindicatos sindicatos={SINDICATOS} />
          <Fontes fontes={[{ rotulo: "Site da FAPERON, Sindicatos Rurais", url: "https://www.faperon.com.br/mapa-sindicatos" }]} />
        </section>

        <section aria-labelledby="acao-titulo" className="rounded-2xl bg-brand-dark p-7 text-white md:p-10">
          <h2 id="acao-titulo" className="text-3xl font-semibold tracking-tight">
            {c.acao.titulo}
          </h2>
          <p className="mt-3 max-w-[66ch] leading-relaxed text-white/90">{c.acao.texto}</p>
          <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {c.acao.etapas.map((e, i) => (
              <li key={e} className="rounded-xl border border-white/15 bg-white/[0.06] p-4">
                <span className="text-sm font-bold tabular-nums text-brand-lime">Etapa {i + 1}</span>
                <p className="mt-1 leading-snug">{e}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-white/80">
            Fonte:{" "}
            <a href={c.acao.fonte.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline underline-offset-2 hover:no-underline">
              {c.acao.fonte.rotulo}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </p>
        </section>
      </div>

      <CtaDuplo
        principal={{
          titulo: "Fale com a FAPERON",
          texto: "Não encontrou seu município ou precisa de outro contato? Envie sua mensagem pelos canais oficiais.",
          rotulo: "Ir para Fale Conosco",
          href: "/fale-conosco",
        }}
        secundaria={{
          titulo: "Central de Inteligência",
          texto: "Dados oficiais do IBGE sobre lavouras e pecuária dos 52 municípios de Rondônia.",
          rotulo: "Conheça a Central",
          href: "/central-de-inteligencia",
        }}
      />
    </>
  );
}
