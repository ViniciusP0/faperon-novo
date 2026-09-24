"use client";

import { Button } from "@/components/ui/button";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container py-24 text-center" role="alert">
      <h1 className="text-3xl font-bold">Algo deu errado</h1>
      <p className="mt-2 text-ink-muted">Não foi possível exibir esta página. Tente novamente.</p>
      <Button size="lg" className="mt-6" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
