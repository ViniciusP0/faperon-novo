"use client";

import { useEffect, useRef, useState } from "react";
import { easeOutCubic, formatarNumeroPtBr, lerNumeroPtBr } from "@/lib/movimento";
import { useEntrouNaTela } from "./use-entrou-na-tela";

/**
 * Texto exibido de um número pt-BR já formatado. O valor final aparece desde o servidor; só um número que começa
 * abaixo da dobra volta a 0 e conta até o valor ao entrar na tela. O que já está visível ao montar, texto sem
 * número (X, –), movimento reduzido ou navegador sem IntersectionObserver ficam no valor final, sem piscar.
 */
export function useContador(valor: string, duracao = 1200) {
  const { ref, entrou, pendente } = useEntrouNaTela<HTMLSpanElement>();
  const [exibido, setExibido] = useState(valor);
  const contar = useRef(false);

  useEffect(() => {
    const leitura = lerNumeroPtBr(valor);
    if (!pendente || !leitura) return;
    contar.current = true;
    setExibido(formatarNumeroPtBr(leitura, 0));
  }, [pendente, valor]);

  useEffect(() => {
    const leitura = lerNumeroPtBr(valor);
    if (!entrou || !contar.current || !leitura) return;
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
