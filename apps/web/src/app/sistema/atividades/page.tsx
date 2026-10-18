import type { Metadata } from "next";
import { Suspense } from "react";
import { Atividades } from "@/components/sistema/atividades/atividades";

export const metadata: Metadata = { title: "Registro de atividades" };

export default function AtividadesPage() {
  // useSearchParams (aba ativa) precisa de Suspense para a página não sair do pré-render estático
  return (
    <Suspense>
      <Atividades />
    </Suspense>
  );
}
