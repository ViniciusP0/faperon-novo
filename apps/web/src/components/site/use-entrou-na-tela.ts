"use client";

import { useEffect, useRef, useState } from "react";
import { reducaoDeMovimento, temObserver } from "@/lib/movimento";

/**
 * Acompanha um elemento que pode ser revelado ao rolar.
 *
 * - `pendente`: o elemento começou abaixo da dobra e ainda não apareceu; é o único momento em que ele fica escondido.
 * - `entrou`: virou true quando ele apareceu na tela, ou na montagem se não há o que esperar.
 *
 * Nada fica escondido antes da hidratação, e o que já está na tela (ou acima dela, como num link direto para uma
 * âncora) nunca é escondido. Com movimento reduzido ou sem IntersectionObserver o elemento nunca fica pendente.
 */
export function useEntrouNaTela<T extends Element>(margem = 0.08) {
  const ref = useRef<T>(null);
  const [entrou, setEntrou] = useState(false);
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const abaixoDaDobra = el.getBoundingClientRect().top >= window.innerHeight * (1 - margem);
    if (reducaoDeMovimento() || !temObserver() || !abaixoDaDobra) {
      setEntrou(true);
      return;
    }
    setPendente(true);
    const observer = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setPendente(false);
          setEntrou(true);
          observer.disconnect();
        }
      },
      { rootMargin: `0px 0px -${margem * 100}% 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [margem]);

  return { ref, entrou, pendente };
}
