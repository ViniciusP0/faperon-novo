import type { Metadata } from "next";
import { Suspense } from "react";
import { Frotas } from "@/components/sistema/frotas/frotas";

export const metadata: Metadata = { title: "Frotas" };

export default function FrotasPage() {
  // useSearchParams (aba ativa) precisa de Suspense para a página não sair do pré-render estático
  return (
    <Suspense>
      <Frotas />
    </Suspense>
  );
}
