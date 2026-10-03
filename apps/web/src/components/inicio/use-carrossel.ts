"use client";

import { useEffect, useRef, useState, type FocusEvent, type TouchEvent } from "react";

export const INTERVALO_MS = 6000;
const LIMITE_TOQUE_PX = 50;

/** Estado do carrossel: rotação automática (pausa com mouse, foco, toque e movimento reduzido), navegação circular e gesto de deslizar. */
export function useCarrossel(total: number) {
  const [atual, setAtual] = useState(0);
  const [reduzido, setReduzido] = useState(false);
  const [escolhaDoUsuario, setEscolhaDoUsuario] = useState<boolean | null>(null);
  const [emUso, setEmUso] = useState(false);
  const toqueInicial = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzido(consulta.matches);
    const aoMudar = (e: MediaQueryListEvent) => setReduzido(e.matches);
    consulta.addEventListener?.("change", aoMudar);
    return () => consulta.removeEventListener?.("change", aoMudar);
  }, []);

  const rotacaoLigada = escolhaDoUsuario ?? !reduzido;
  const girando = rotacaoLigada && !emUso && total > 1;

  useEffect(() => {
    if (!girando) return;
    const id = setInterval(() => setAtual((i) => (i + 1) % total), INTERVALO_MS);
    return () => clearInterval(id);
  }, [girando, atual, total]);

  const ir = (indice: number) => setAtual(((indice % total) + total) % total);

  const gestos = {
    onMouseEnter: () => setEmUso(true),
    onMouseLeave: () => setEmUso(false),
    onFocus: () => setEmUso(true),
    onBlur: (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setEmUso(false);
    },
    onTouchStart: (e: TouchEvent) => {
      toqueInicial.current = e.touches[0]?.clientX ?? null;
    },
    onTouchCancel: () => {
      toqueInicial.current = null;
    },
    onTouchEnd: (e: TouchEvent) => {
      if (toqueInicial.current === null) return;
      const delta = (e.changedTouches[0]?.clientX ?? toqueInicial.current) - toqueInicial.current;
      toqueInicial.current = null;
      if (Math.abs(delta) >= LIMITE_TOQUE_PX) ir(atual + (delta < 0 ? 1 : -1));
    },
  };

  return { atual, ir, girando, rotacaoLigada, alternarRotacao: () => setEscolhaDoUsuario(!rotacaoLigada), gestos };
}
