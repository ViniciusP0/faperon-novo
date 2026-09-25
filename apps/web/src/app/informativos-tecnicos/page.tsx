import type { Metadata } from "next";
import { ArquivoInformativos } from "@/components/informativos/arquivo-informativos";
import { CtaDuplo } from "@/components/site/cta-duplo";
import { FaixaNumeros } from "@/components/site/faixa-numeros";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { buttonVariants } from "@/components/ui/button";
import { INFORMATIVOS as inf } from "@/content/informativos";
import { formatData } from "@/lib/format";
import { maisRecente } from "@/lib/informativos";
import { CNA_COMMODITIES_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: inf.seo.titulo,
  description: inf.seo.descricao,
  alternates: { canonical: "/informativos-tecnicos" },
};

export default function InformativosPage() {
  const [corte, leite] = inf.categorias;
  return (
    <>
      <HeroPagina
        id="informativos-titulo"
        atual="Informativos Técnicos"
        titulo={
          <>
            Informativos mensais do <Destaque>agro de Rondônia</Destaque>, em PDF.
          </>
        }
      >
        <p>Acompanhamento mensal do setor agropecuário de Rondônia: bovinocultura de corte e de leite, além dos boletins técnicos.</p>
        <a href="#arquivo" className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
          Ver todos os informativos
        </a>
      </HeroPagina>

      <FaixaNumeros
        rotulo="Publicações"
        itens={[
          { rotulo: corte!.titulo, valor: String(corte!.itens.length), detalhe: "informativos mensais" },
          { rotulo: leite!.titulo, valor: String(leite!.itens.length), detalhe: "informativos mensais" },
          { rotulo: "Boletins técnicos", valor: String(inf.boletins.length), detalhe: "edição 2024.2" },
        ]}
      />

      <section aria-labelledby="ultimas-titulo" className="container pt-16">
        <h2 id="ultimas-titulo" className="text-[1.75rem] font-semibold tracking-tight">
          Últimas edições
        </h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {inf.categorias.map((c) => {
            const item = maisRecente(c.itens);
            return (
              <article key={c.id} className="flex flex-col gap-1.5 rounded-md border-t-4 border-brand-light bg-surface-alt p-7">
                <p className="text-[0.8rem] font-semibold uppercase tracking-wider text-brand">{c.titulo}</p>
                <h3 className="text-2xl font-semibold leading-tight tracking-tight">Informativo Mensal, {item.titulo}</h3>
                <p className="text-[0.95rem] text-ink-muted">
                  Publicado em <time dateTime={item.data}>{formatData(item.data)}</time>
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Baixar informativo ${item.titulo} – ${c.titulo} (PDF, abre em nova aba)`}
                  className={cn(buttonVariants({ size: "lg" }), "mt-4 self-start")}
                >
                  Baixar
                  <span aria-hidden="true" className="rounded bg-white/20 px-1.5 text-[0.7rem] font-bold">
                    PDF
                  </span>
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section id="arquivo" aria-labelledby="arquivo-titulo" className="container scroll-mt-24 pt-16">
        <h2 id="arquivo-titulo" className="mb-5 text-[1.75rem] font-semibold tracking-tight">
          Arquivo
        </h2>
        <ArquivoInformativos categorias={inf.categorias} />
      </section>

      <section aria-labelledby="boletins-titulo" className="container pt-16">
        <h2 id="boletins-titulo" className="text-[1.75rem] font-semibold tracking-tight">
          Boletins técnicos
        </h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {inf.boletins.map((b) => (
            <li key={b.url}>
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${b.titulo} (PDF, abre em nova aba)`}
                className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-md border border-l-4 border-line border-l-steel px-6 py-5 hover:bg-[#e4edf3]"
              >
                <span
                  aria-hidden="true"
                  className="grid h-14 w-11 place-items-center rounded bg-steel text-xs font-bold text-white"
                >
                  PDF
                </span>
                <span>
                  <span className="block text-[1.05rem] font-semibold leading-snug">{b.titulo}</span>
                  <span className="text-sm text-ink-muted">
                    Publicado em <time dateTime={b.data}>{formatData(b.data)}</time>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <CtaDuplo
        principal={{
          titulo: "Central de Inteligência Agropecuária",
          texto: "Ranking dos municípios, série histórica, comparação, análise pronta e relatório em PDF, tudo em um painel.",
          rotulo: "Conheça a Central de Inteligência",
          href: "/central-de-inteligencia",
        }}
        secundaria={{
          titulo: "Preços das commodities",
          texto: "A CNA atualiza todos os dias as cotações das principais bolsas do mundo e das praças brasileiras.",
          rotulo: "Confira os preços na CNA",
          href: CNA_COMMODITIES_URL,
          externo: true,
        }}
      />
    </>
  );
}
