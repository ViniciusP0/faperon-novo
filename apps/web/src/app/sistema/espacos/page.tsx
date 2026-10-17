import type { Metadata } from "next";
import { Suspense } from "react";
import { Espacos } from "@/components/sistema/espacos/espacos";

export const metadata: Metadata = { title: "Espaços" };

export default function EspacosPage() {
  // useSearchParams (aba ativa) precisa de Suspense para a página não sair do pré-render estático
  return (
    <Suspense>
      <Espacos />
    </Suspense>
  );
}
