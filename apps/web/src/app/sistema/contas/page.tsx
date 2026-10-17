import type { Metadata } from "next";
import { Suspense } from "react";
import { Contas } from "@/components/sistema/contas/contas";

export const metadata: Metadata = { title: "Prestação de contas" };

export default function ContasPage() {
  // useSearchParams (aba ativa) precisa de Suspense para a página não sair do pré-render estático
  return (
    <Suspense>
      <Contas />
    </Suspense>
  );
}
