import type { Metadata } from "next";
import { Suspense } from "react";
import { Painel } from "@/components/painel/painel";
import { Skeleton } from "@/components/ui/feedback";

export const metadata: Metadata = {
  title: "Painel Agro Analítico RO",
  description:
    "Ranking, série histórica, comparação e análise da produção agrícola e pecuária dos 52 municípios de Rondônia, com dados do IBGE.",
  alternates: { canonical: "/painel" },
};

export default function PainelPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-10" role="status">
          <span className="sr-only">Carregando o painel…</span>
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <Painel />
    </Suspense>
  );
}
