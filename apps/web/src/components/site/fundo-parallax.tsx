"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/** Figuras extraídas da capa do boletim, em `public/fundo`. */
type Figura =
  | "vaca"
  | "soja"
  | "galinha"
  | "ovos"
  | "mandioca"
  | "cafe"
  | "melancia"
  | "cacau"
  | "grao-cafe"
  | "milho"
  | "tambaqui"
  | "arroz";

interface Item {
  figura: Figura;
  /** Posição horizontal, em % da largura da tela; as figuras ficam nas laterais, fora da coluna de texto. */
  x: number;
  /** Posição vertical inicial, em % da altura da tela. */
  y: number;
  tamanho: number;
  giro: number;
  /** Fração do scroll que a figura acompanha; valores maiores sobem mais rápido. */
  velocidade: number;
}

const ITENS: Item[] = [
  { figura: "vaca", x: 0.5, y: 4, tamanho: 100, giro: -8, velocidade: 0.14 },
  { figura: "soja", x: 92.5, y: 12, tamanho: 100, giro: 10, velocidade: 0.24 },
  { figura: "galinha", x: 0.8, y: 30, tamanho: 90, giro: 6, velocidade: 0.2 },
  { figura: "ovos", x: 93, y: 38, tamanho: 90, giro: -7, velocidade: 0.16 },
  { figura: "mandioca", x: 0.5, y: 55, tamanho: 100, giro: 8, velocidade: 0.26 },
  { figura: "cafe", x: 92.5, y: 62, tamanho: 100, giro: -10, velocidade: 0.12 },
  { figura: "melancia", x: 0.8, y: 78, tamanho: 90, giro: -6, velocidade: 0.28 },
  { figura: "cacau", x: 93, y: 86, tamanho: 90, giro: 12, velocidade: 0.18 },
  { figura: "grao-cafe", x: 0.5, y: 100, tamanho: 100, giro: 5, velocidade: 0.22 },
  { figura: "milho", x: 92.5, y: 108, tamanho: 100, giro: -5, velocidade: 0.15 },
  { figura: "tambaqui", x: 0.8, y: 122, tamanho: 90, giro: -9, velocidade: 0.25 },
  { figura: "arroz", x: 93, y: 130, tamanho: 90, giro: 9, velocidade: 0.19 },
];

/** Fundo decorativo fixo, atrás de todo o conteúdo, com as figuras da capa do boletim em parallax suave nas laterais. */
export function FundoParallax() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const figuras = (Array.from(el.children) as HTMLElement[]).map((f, i) => ({ f, item: ITENS[i]! }));
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let quadro = 0;
    // Cada figura sobe a uma velocidade própria e, ao sair pelo topo, volta por baixo, então a tela nunca fica vazia.
    const atualizar = () => {
      quadro = 0;
      const altura = window.innerHeight;
      const rolagem = parado ? 0 : window.scrollY;
      figuras.forEach(({ f, item }) => {
        const ciclo = altura + item.tamanho * 2;
        const base = (item.y / 100) * altura + item.tamanho;
        const y = ((((base - rolagem * item.velocidade) % ciclo) + ciclo) % ciclo) - item.tamanho;
        f.style.transform = `translate3d(0, ${y}px, 0) rotate(${item.giro + rolagem * 0.01}deg)`;
      });
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(atualizar);
    };
    atualizar();
    if (parado) return;
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <div
      ref={raiz}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-[0.14] md:opacity-[0.22] xl:opacity-[0.34]"
    >
      {ITENS.map((item, i) => (
        <div key={i} className="absolute top-0" style={{ left: `${item.x}%`, width: item.tamanho, height: item.tamanho, willChange: "transform" }}>
          <Image src={`/fundo/${item.figura}.webp`} alt="" width={360} height={360} className="h-full w-full rounded-2xl object-cover" />
        </div>
      ))}
    </div>
  );
}
