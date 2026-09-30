import { ExternalLink, GraduationCap, MapPin, Sprout, TrendingUp, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BannersSenar } from "@/components/inicio/banners-senar";
import { HeroCarrossel, type SlideHero } from "@/components/inicio/hero-carrossel";
import { NoticiaChamada } from "@/components/inicio/noticia-chamada";
import { SlideImagem } from "@/components/inicio/slide-imagem";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HERO } from "@/content/hero";
import { INICIO } from "@/content/inicio";
import { noticiasRecentes, type Noticia } from "@/content/noticias";
import { SENAR } from "@/content/senar";
import { SOBRE } from "@/content/sobre";
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

const ICONES_SISTEMA: Record<string, LucideIcon> = {
  "SENAR Rondônia": GraduationCap,
  IPAGRO: Sprout,
  "Sindicatos Rurais": MapPin,
  "Comissão Mulheres": Users,
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
  const noticiasTicker = noticiasRecentes(5);
  const itens = (indicadores?.itens ?? []).map(normalizarDestaque);
  const partes = manchete(itens);
  const numeros = numerosDoAgro(culturas, itens.find((i) => i.chave === "bovino"), municipios);

  const itemTicker = (lista: Noticia[], duplicado = false) =>
    lista.map((n, i) => (
      <li key={`${n.slug}-${duplicado ? "dup" : "orig"}`} aria-hidden={duplicado || undefined} className="flex items-center gap-2">
        {(i > 0 || duplicado) && (
          <span aria-hidden="true" className="text-line">
            |
          </span>
        )}
        {n.url_original ? (
          <a href={n.url_original} target="_blank" rel="noopener noreferrer" tabIndex={duplicado ? -1 : undefined} className="hover:text-brand hover:underline">
            {n.titulo}
            <span className="sr-only"> (abre no site atual em nova aba)</span>
          </a>
        ) : (
          <span>{n.titulo}</span>
        )}
      </li>
    ));

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

      <section aria-labelledby="sistema-titulo" className="container mt-8">
        <Card className="p-5 md:p-6">
          <h2 id="sistema-titulo" className="text-sm font-bold uppercase tracking-wide text-brand">
            Sistema FAPERON
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SOBRE.sistema.entidades.map((e) => {
              const Icone = ICONES_SISTEMA[e.nome] ?? Sprout;
              return (
                <li key={e.nome} className="flex">
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex w-full items-center gap-3 rounded-xl border border-line p-4 transition-colors hover:border-brand-light hover:bg-brand-soft"
                  >
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand group-hover:bg-white">
                      <Icone aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold uppercase leading-tight">{e.nome}</span>
                      <span className="mt-0.5 block text-sm font-medium text-brand">{e.acao} →</span>
                    </span>
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <section aria-label="Notícias" className="mt-8 border-y border-line bg-white">
        <div className="container flex items-center gap-4 py-3 text-sm">
          <span className="shrink-0 font-bold uppercase tracking-wide text-brand">Notícias</span>
          <div className="group flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]">
            <ul className="flex w-max animate-[marquee_54s_linear_infinite] items-center gap-x-2 whitespace-nowrap text-ink-muted group-hover:[animation-play-state:paused]">
              {itemTicker(noticiasTicker)}
              {itemTicker(noticiasTicker, true)}
            </ul>
          </div>
          <a
            href={WIX_PAGINAS.noticias}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-brand hover:underline"
          >
            Ver todas as notícias
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only"> (abre o site atual em nova aba)</span>
          </a>
        </div>
      </section>

      <section aria-label={commodities.titulo} className="container mt-10">
        <Card className="mx-auto max-w-2xl border-transparent bg-brand-dark text-white shadow-md">
          <CardHeader className="flex-row items-center gap-2 pb-2">
            <TrendingUp aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-lime" />
            <CardTitle className="text-white">{commodities.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-white/90">{commodities.texto}</p>
            <a
              href={commodities.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 bg-brand-lime text-brand-dark hover:bg-[#9bdc60]")}
            >
              {commodities.cta_texto}
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </CardContent>
        </Card>
      </section>

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

      <section aria-labelledby="central-titulo" className="mt-16 bg-brand-dark px-4 py-12 text-white md:px-6">
        <div className="container">
          <h2 id="central-titulo" className="max-w-[36ch] text-3xl font-semibold leading-tight tracking-tight">
            {central.titulo}
          </h2>
          <p className="mt-3.5 max-w-[60ch] leading-relaxed text-white/90">{central.texto}</p>
          <Link href={central.cta_url} className={cn(buttonVariants({ size: "lg" }), "mt-6 bg-brand-lime text-brand-dark hover:bg-[#9bdc60]")}>
            {central.cta_texto}
          </Link>
        </div>
      </section>

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
