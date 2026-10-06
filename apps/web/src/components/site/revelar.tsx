"use client";

import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useEntrouNaTela } from "./use-entrou-na-tela";

interface RevelarProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "li" | "ul" | "aside";
  /** Posição entre irmãos: cada posição atrasa 60 ms, até o teto de 4 itens, para a revelação nunca parecer lenta. */
  indice?: number;
}

/** Revela o conteúdo com um fade curto ao entrar na tela. Sem JS ou com movimento reduzido ele já aparece normal. */
export function Revelar({ as = "div", indice = 0, className, style, children, ...resto }: RevelarProps) {
  const { ref, entrou } = useEntrouNaTela<HTMLElement>();
  const Elemento = as as ElementType;
  const atraso = Math.min(indice, 3) * 60;
  return (
    <Elemento
      ref={ref}
      className={cn("revelar", entrou && "revelar-visivel", className)}
      style={atraso ? { ...style, transitionDelay: `${atraso}ms` } : style}
      {...resto}
    >
      {children}
    </Elemento>
  );
}
