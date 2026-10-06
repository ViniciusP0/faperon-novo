"use client";

import { useEffect, useState } from "react";
import { easeOutCubic, formatarNumeroPtBr, lerNumeroPtBr, reducaoDeMovimento, temObserver } from "@/lib/movimento";
import { useEntrouNaTela } from "./use-entrou-na-tela";

const podeAnimar = () => !reducaoDeMovimento() && temObserver();

/**
 * Texto exibido de um número pt-BR já formatado: o valor final até a hidratação (SEO e sem JS), depois 0 e, ao
 * entrar na tela, a contagem até o valor. Texto sem número (X, –) nunca anima.
 */
export function useContador(valor: string, duracao = 1200) {
  const { ref, entrou } = useEntrouNaTela<HTMLSpanElement>();
  const [exibido, setExibido] = useState(valor);

  useEffect(() => {
    const leitura = lerNumeroPtBr(valor);
    if (leitura && podeAnimar()) setExibido(formatarNumeroPtBr(leitura, 0));
  }, [valor]);

  useEffect(() => {
    const leitura = lerNumeroPtBr(valor);
    if (!entrou || !leitura || !podeAnimar()) return;
    let quadro = 0;
    let inicio: number | null = null;
    const passo = (agora: number) => {
      inicio ??= agora;
      const p = Math.min(1, (agora - inicio) / duracao);
      setExibido(p >= 1 ? valor : formatarNumeroPtBr(leitura, easeOutCubic(p)));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [entrou, valor, duracao]);

  return { ref, exibido };
}
