import type { Metadata } from "next";
import { GaleriaAlbuns } from "@/components/galeria/galeria-albuns";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { ALBUNS } from "@/content/galeria";

export const metadata: Metadata = {
  title: "Galeria",
  description: "Fotos dos eventos da FAPERON e do Sistema FAPERON/SENAR: dias de campo, formaturas, missões, congressos e capacitações em Rondônia.",
  alternates: { canonical: "/galeria" },
};

export default function GaleriaPage() {
  return (
    <>
      <HeroPagina
        id="galeria-titulo"
        atual="Galeria"
        titulo={
          <>
            <Destaque>Galeria</Destaque> de eventos
          </>
        }
      >
        <p>Dias de campo, formaturas, missões, congressos e capacitações da FAPERON e do Sistema FAPERON/SENAR, em fotos de todo o estado.</p>
      </HeroPagina>

      <section aria-label="Álbuns de eventos" className="container pb-10 pt-2">
        <GaleriaAlbuns albuns={ALBUNS} />
        <p className="mt-10 text-sm text-ink-muted">
          Fotos publicadas nos sites da FAPERON e do Sistema FAPERON/SENAR. Cada álbum reúne parte das imagens da matéria; o texto completo abre no site de origem.
        </p>
      </section>
    </>
  );
}
