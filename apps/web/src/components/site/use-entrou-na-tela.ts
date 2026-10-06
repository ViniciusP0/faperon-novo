"use client";

import { useEffect, useRef, useState } from "react";
import { reducaoDeMovimento, temObserver } from "@/lib/movimento";

/**
 * `entrou` vira true uma única vez, quando o elemento aparece na tela. Com movimento reduzido ou sem
 * IntersectionObserver vira true já na montagem, e nenhum observer é criado.
 */
export function useEntrouNaTela<T extends Element>(margem = "0px 0px -8% 0px") {
  const ref = useRef<T>(null);
  const [entrou, setEntrou] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducaoDeMovimento() || !temObserver()) {
      setEntrou(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEntrou(true);
          observer.disconnect();
        }
      },
      { rootMargin: margem },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [margem]);

  return { ref, entrou };
}
