"use client";

import { useEffect, useState } from "react";
import { temaAtual } from "@/lib/tema";

/** Acompanha o tema do site (data-theme em <html>), inclusive quando o visitante alterna com a página aberta. */
export function useEscuro(): boolean {
  const [escuro, setEscuro] = useState(false);
  useEffect(() => {
    const ler = () => setEscuro(temaAtual() === "escuro");
    ler();
    const obs = new MutationObserver(ler);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return escuro;
}
