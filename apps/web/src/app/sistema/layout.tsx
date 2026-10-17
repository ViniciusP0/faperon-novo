import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BarraSistema } from "@/components/sistema/barra-sistema";
import { ExigeLogin } from "@/components/sistema/exige-login";
import { SistemaProvider } from "@/lib/sistema/estado";

export const metadata: Metadata = {
  title: { default: "Sistema (protótipo)", template: "%s | Sistema FAPERON (protótipo)" },
  robots: { index: false, follow: false },
};

export default function SistemaLayout({ children }: { children: ReactNode }) {
  return (
    <SistemaProvider>
      <BarraSistema />
      <div className="container py-8">
        <ExigeLogin>{children}</ExigeLogin>
      </div>
    </SistemaProvider>
  );
}
