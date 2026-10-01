import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { FundoParallax } from "@/components/site/fundo-parallax";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SITE_URL } from "@/lib/site";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "FAPERON – Federação da Agricultura e Pecuária de Rondônia", template: "%s | FAPERON" },
  description: "Central de Inteligência Agropecuária da FAPERON: dados oficiais do IBGE sobre a agricultura e a pecuária de Rondônia.",
  icons: { icon: "/marca-faperon.png" },
  openGraph: { siteName: "FAPERON", locale: "pt_BR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#00604e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        <a
          href="#conteudo"
          className="sr-only-focusable fixed left-4 top-4 z-50 rounded-lg bg-white px-4 py-2 font-medium text-brand-dark shadow-lg"
        >
          Ir para o conteúdo
        </a>
        <FundoParallax />
        <SiteHeader />
        <main id="conteudo" className="flex-1">
          <Providers>{children}</Providers>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
