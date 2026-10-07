import type { Metadata } from "next";
import { Suspense } from "react";
import { BlocoCrescimento } from "@/components/observatorio/bloco-crescimento";
import { BlocoPanorama } from "@/components/observatorio/bloco-panorama";
import { BlocoPecuaria } from "@/components/observatorio/bloco-pecuaria";
import { BlocoTerritorio } from "@/components/observatorio/bloco-territorio";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { IndiceSecoes } from "@/components/sobre/indice-secoes";
import { Skeleton } from "@/components/ui/feedback";
import { OBSERVATORIO as c } from "@/content/observatorio";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: "/central-de-inteligencia/observatorio" },
};

export default function ObservatorioPage() {
  return (
    <>
      <HeroPagina id="observatorio-titulo" atual={c.titulo} titulo={<>O agro de Rondônia, <Destaque>explicado</Destaque>.</>}>
        <p>{c.intro}</p>
      </HeroPagina>
      <div className="border-t-2 border-ink">
        <div className="container grid gap-10 lg:grid-cols-[12rem_1fr]">
          <IndiceSecoes secoes={c.secoes} />
          <Suspense fallback={<div role="status" className="py-12"><span className="sr-only">Carregando o Observatório…</span><Skeleton className="h-64 w-full" /></div>}>
            <div className="min-w-0 space-y-16 pb-8">
              <BlocoPanorama />
              <BlocoCrescimento />
              <BlocoTerritorio />
              <BlocoPecuaria />
            </div>
          </Suspense>
        </div>
      </div>
    </>
  );
}
