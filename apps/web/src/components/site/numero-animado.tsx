"use client";

import { useContador } from "./use-contador";

/** Número que conta de 0 até o valor ao entrar na tela. O valor final fica no HTML para leitores de tela. */
export function NumeroAnimado({ valor, duracao }: { valor: string; duracao?: number }) {
  const { ref, exibido } = useContador(valor, duracao);
  return (
    <>
      <span className="sr-only">{valor}</span>
      <span ref={ref} aria-hidden="true">
        {exibido}
      </span>
    </>
  );
}
