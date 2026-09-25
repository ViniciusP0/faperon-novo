import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BannersSenar } from "@/components/inicio/banners-senar";
import { FaixaIndicadores } from "@/components/inicio/faixa-indicadores";
import { HeroCarrossel, type SlideHero } from "@/components/inicio/hero-carrossel";
import { NoticiaChamada } from "@/components/inicio/noticia-chamada";
import { SlideImagem } from "@/components/inicio/slide-imagem";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { HERO } from "@/content/hero";
import { INICIO } from "@/content/inicio";
import { noticiasRecentes } from "@/content/noticias";
import { SENAR } from "@/content/senar";
import type { Destaque } from "@/lib/api-types";
import { manchete, normalizarDestaque } from "@/lib/destaques";
import { formatCompacto, formatNumero } from "@/lib/format";
import { contarMunicipios, contarProdutos, destaques as buscarDestaques } from "@/lib/server-api";
import { WIX_PAGINAS } from "@/lib/site";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "FAPERON – Federação da Agricultura e Pecuária de Rondônia" },
  description: "Notícias, Central de Inteligência e Painel Agro Analítico com dados oficiais do IBGE sobre a agropecuária de Rondônia.",
  alternates: { canonical: "/" },
};

interface NumeroAgro {
  valor: string;
  rotulo: string;
  texto: string;
}

function numerosDoAgro(culturas: number | null, bovino: Destaque | undefined, municipios: number | null): NumeroAgro[] {
  const numeros: NumeroAgro[] = [];
  if (culturas) {
    numeros.push({ valor: formatNumero(culturas), rotulo: "culturas agrícolas", texto: "Lavouras temporárias e permanentes publicadas pelo IBGE para Rondônia." });
  }
  if (bovino?.total) {
    numeros.push({ valor: formatCompacto(bovino.total), rotulo: "cabeças de gado", texto: "Rebanho bovino, além de suínos, aves e outros rebanhos." });
  }
  if (municipios) {
    numeros.push({ valor: formatNumero(municipios), rotulo: "municípios", texto: "Compare qualquer município de Rondônia com o restante do estado." });
  }
  return numeros;
}

export default async function InicioPage() {
  const [indicadores, culturas, municipios] = await Promise.all([
    buscarDestaques(),
    contarProdutos("agricultura"),
    contarMunicipios(),
  ]);
  const { central, commodities, nosso_agro } = INICIO;
  const noticias = noticiasRecentes(3);
  const itens = (indicadores?.itens ?? []).map(normalizarDestaque);
  const partes = manchete(itens);
  const numeros = numerosDoAgro(culturas, itens.find((i) => i.chave === "bovino"), municipios);

  const slides: SlideHero[] = [
    {
      id: "faperon",
      titulo: HERO.faperon.titulo,
      conteudo: (
        <SlideImagem
          prioridade
          imagem={HERO.faperon.imagem}
          posicao={HERO.faperon.posicao}
          titulo={HERO.faperon.titulo}
          texto={HERO.faperon.texto}
          ctaTexto={HERO.faperon.cta_texto}
          ctaUrl={HERO.faperon.cta_url}
        />
      ),
    },
    {
      id: "numeros",
      titulo: HERO.numeros.titulo,
      conteudo: (
        <div className="flex min-h-[560px] items-center bg-surface-alt md:min-h-[600px]">
          <div className="w-full pb-24 pt-14 md:pb-28">
            <div className="container grid items-end gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-16">
              <h2 id="manchete" className="text-3xl font-semibold leading-[1.16] tracking-tight md:text-4xl lg:text-5xl">
                {partes ? (
                  partes.map((p, i) =>
                    p.destaque ? (
                      <strong key={i} className="font-bold text-brand">
                        {p.texto}
                      </strong>
                    ) : (
                      <span key={i}>{p.texto}</span>
                    ),
                  )
                ) : (
                  "Dados oficiais do IBGE sobre a agricultura e a pecuária dos 52 municípios de Rondônia"
                )}
              </h2>
              <div>
                <p className="max-w-[40ch] leading-relaxed text-ink-muted">
                  Os números vêm do IBGE e cobrem os 52 municípios. Escolha um indicador abaixo para ver a evolução e os municípios que lideram.
                </p>
                <Link href="/painel" className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
                  Abrir o Painel Agro Analítico
                </Link>
                <p className="mt-3.5 text-sm text-ink-muted">
                  Fonte: IBGE, Pesquisa Agrícola Municipal e Pesquisa da Pecuária Municipal.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "senar",
      titulo: HERO.senar.titulo,
      conteudo: (
        <SlideImagem
          imagem={HERO.senar.imagem}
          posicao={HERO.senar.posicao}
          etiqueta={HERO.senar.etiqueta}
          titulo={HERO.senar.titulo}
          texto={HERO.senar.texto}
          ctaTexto={HERO.senar.cta_texto}
          ctaUrl={HERO.senar.cta_url}
        />
      ),
    },
  ];

  return (
    <>
      <h1 className="sr-only">FAPERON – Federação da Agricultura e Pecuária de Rondônia</h1>
      <HeroCarrossel rotulo={HERO.rotulo} slides={slides} />

      {itens.length > 0 ? (
        <FaixaIndicadores itens={itens} />
      ) : (
        <div className="container">
          <Alert tone="erro" title="Indicadores indisponíveis no momento">
            Não foi possível carregar os números do IBGE. O painel continua disponível em Painel Agro RO.
          </Alert>
        </div>
      )}

      <section aria-labelledby="senar-titulo" className="container mt-16">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 id="senar-titulo" className="text-2xl font-semibold md:text-3xl">
            {SENAR.titulo}
          </h2>
          <a
            href={SENAR.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            {SENAR.link_texto}
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </div>
        <BannersSenar banners={SENAR.banners} rotulo={SENAR.rotulo} url={SENAR.url} />
      </section>

      <section aria-labelledby="noticias-titulo" className="container mt-16">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 id="noticias-titulo" className="text-2xl font-semibold md:text-3xl">
            Notícias recentes
          </h2>
          <a
            href={WIX_PAGINAS.noticias}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            Ver todas as notícias
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only"> (abre o site atual em nova aba)</span>
          </a>
        </div>
        <ul className="grid gap-8 md:grid-cols-3">
          {noticias.map((n) => (
            <li key={n.slug}>
              <NoticiaChamada noticia={n} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-16 grid lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="central-titulo" className="bg-brand-dark px-4 py-12 text-white md:px-6 lg:pl-[max(1.5rem,calc((100vw-1200px)/2+1.5rem))] lg:pr-14">
          <h2 id="central-titulo" className="max-w-[20ch] text-3xl font-semibold leading-tight tracking-tight">
            {central.titulo}
          </h2>
          <p className="mt-3.5 max-w-[46ch] leading-relaxed text-white/90">{central.texto}</p>
          <Link href={central.cta_url} className={cn(buttonVariants({ size: "lg" }), "mt-6 bg-brand-lime text-brand-dark hover:bg-[#9bdc60]")}>
            {central.cta_texto}
          </Link>
        </section>
        <aside aria-labelledby="commodities-titulo" className="bg-[#e4edf3] px-4 py-12 md:px-6 lg:pl-14 lg:pr-[max(1.5rem,calc((100vw-1200px)/2+1.5rem))]">
          <h2 id="commodities-titulo" className="text-2xl font-semibold">
            {commodities.titulo}
          </h2>
          <p className="mt-2.5 max-w-[42ch] leading-relaxed text-ink-muted">{commodities.texto}</p>
          <a
            href={commodities.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5 border-2 border-steel text-steel hover:bg-steel hover:text-white")}
          >
            {commodities.cta_texto}
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </aside>
      </div>

      {numeros.length > 0 && (
        <section aria-labelledby="nosso-agro-titulo" className="container mt-16">
          <h2 id="nosso-agro-titulo" className="text-2xl font-semibold md:text-3xl">
            {nosso_agro.titulo}
          </h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-muted">{nosso_agro.texto}</p>
          <ul className="mt-6 grid gap-10 md:grid-cols-3">
            {numeros.map((n) => (
              <li key={n.rotulo}>
                <p className="text-3xl font-semibold tracking-tight text-brand tabular-nums md:text-4xl">{n.valor}</p>
                <h3 className="mt-2.5 text-lg font-semibold">{n.rotulo}</h3>
                <p className="mt-1.5 max-w-[36ch] text-ink-muted">{n.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
