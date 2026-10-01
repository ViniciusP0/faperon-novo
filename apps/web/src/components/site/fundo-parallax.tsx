"use client";

import { useEffect, useRef, type ReactElement } from "react";

type Figura = "cafe" | "cacau" | "milho" | "soja";

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
  { figura: "cafe", x: 0.5, y: 8, tamanho: 100, giro: -8, velocidade: 0.14 },
  { figura: "soja", x: 92.5, y: 20, tamanho: 100, giro: 10, velocidade: 0.24 },
  { figura: "milho", x: 0.5, y: 50, tamanho: 100, giro: 8, velocidade: 0.2 },
  { figura: "cacau", x: 92.5, y: 62, tamanho: 100, giro: -10, velocidade: 0.12 },
  { figura: "soja", x: 0.8, y: 88, tamanho: 90, giro: -6, velocidade: 0.28 },
  { figura: "cafe", x: 93, y: 100, tamanho: 90, giro: 12, velocidade: 0.18 },
];

/** Recortes e nervuras usam a cor da página, para parecerem vazados na silhueta. */
const RECORTE = { fill: "none", stroke: "var(--surface)", strokeLinecap: "round", strokeLinejoin: "round" } as const;
const HASTE = { fill: "none", stroke: "currentColor", strokeLinecap: "round" } as const;

/** Grãos da espiga: grade de pontos que cabe dentro do contorno do sabugo. */
const GRAOS = Array.from({ length: 9 }, (_, linha) => {
  const y = 20 + linha * 7.2;
  const meia = 14 * Math.sin(((y - 12) / 62) * Math.PI) + 3;
  const quantidade = Math.max(2, Math.round((meia * 2) / 6.2));
  return Array.from({ length: quantidade }, (_, c) => ({ x: 50 - meia + ((c + 0.5) * meia * 2) / quantidade, y }));
}).flat();

const DESENHOS: Record<Figura, ReactElement> = {
  cafe: (
    <g>
      <path d="M12 90 C 32 74, 52 58, 82 24" {...HASTE} strokeWidth="2.6" />
      <path d="M40 62 C 36 40, 54 26, 80 28 C 80 50, 62 64, 40 62 Z" fillOpacity="0.62" fill="currentColor" />
      <path d="M44 58 C 56 46, 66 38, 76 31" {...RECORTE} strokeWidth="1.3" />
      <path d="M28 76 C 10 68, 8 46, 22 34 C 38 40, 42 60, 28 76 Z" fill="currentColor" />
      <path d="M26 70 C 24 58, 24 48, 24 40" {...RECORTE} strokeWidth="1.3" />
      {[
        [62, 78],
        [75, 72],
        [69, 89],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="8.5" fill="currentColor" />
          <circle cx={cx} cy={cy! - 6.5} r="2" fill="var(--surface)" />
        </g>
      ))}
    </g>
  ),
  cacau: (
    <g>
      <path d="M50 4 V12" {...HASTE} strokeWidth="3" />
      <path d="M50 10 C 84 22, 88 78, 50 96 C 12 78, 16 22, 50 10 Z" fill="currentColor" />
      <path d="M50 12 C 42 34, 42 70, 50 94 M50 12 C 58 34, 58 70, 50 94 M34 20 C 28 42, 30 68, 38 86 M66 20 C 72 42, 70 68, 62 86" {...RECORTE} strokeWidth="1.8" />
      <path d="M30 34 C 27 46, 28 58, 31 68" fill="none" stroke="var(--surface)" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  milho: (
    <g>
      <path d="M50 8 C 72 14, 78 48, 66 74 L 34 74 C 22 48, 28 14, 50 8 Z" fillOpacity="0.45" fill="currentColor" />
      {GRAOS.map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r="2.7" fill="currentColor" />
      ))}
      <path d="M34 78 C 8 70, 8 40, 22 24 C 24 50, 32 64, 44 74 Z" fillOpacity="0.8" fill="currentColor" />
      <path d="M66 78 C 92 70, 92 40, 78 24 C 76 50, 68 64, 56 74 Z" fillOpacity="0.8" fill="currentColor" />
      <path d="M22 52 C 24 62, 32 70, 40 74 M78 52 C 76 62, 68 70, 60 74" {...RECORTE} strokeWidth="1.2" />
      <path d="M50 74 V96" {...HASTE} strokeWidth="4" />
    </g>
  ),
  soja: (
    <g>
      <path d="M20 94 C 26 66, 40 40, 66 12" {...HASTE} strokeWidth="2.6" />
      {[
        { d: "M38 62 C 14 62, 8 40, 18 24", g: [[26, 56], [17, 46], [16, 34]] },
        { d: "M52 44 C 78 46, 90 66, 84 86", g: [[66, 50], [78, 60], [83, 74]] },
        { d: "M62 22 C 82 18, 94 30, 92 46", g: [[74, 21], [85, 26], [90, 37]] },
      ].map((vagem) => (
        <g key={vagem.d}>
          <path d={vagem.d} {...HASTE} strokeWidth="15" />
          {vagem.g.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill="var(--surface)" fillOpacity="0.55" />
          ))}
          <path d={vagem.d} {...RECORTE} strokeWidth="1" strokeOpacity="0.7" strokeDasharray="1 3" />
        </g>
      ))}
    </g>
  ),
};

/** Fundo decorativo fixo, atrás de todo o conteúdo, com café, cacau, milho e soja em parallax suave nas laterais. */
export function FundoParallax() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const figuras = Array.from(el.children) as HTMLElement[];
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let quadro = 0;
    // Cada figura sobe a uma velocidade própria e, ao sair pelo topo, volta por baixo, então a tela nunca fica vazia.
    const atualizar = () => {
      quadro = 0;
      const altura = window.innerHeight;
      const rolagem = parado ? 0 : window.scrollY;
      figuras.forEach((f, i) => {
        const item = ITENS[i]!;
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
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-brand-light opacity-[0.14] md:opacity-[0.22] xl:opacity-[0.34]"
    >
      {ITENS.map((item, i) => (
        <div key={i} className="absolute top-0" style={{ left: `${item.x}%`, width: item.tamanho, height: item.tamanho, willChange: "transform" }}>
          <svg viewBox="0 0 100 100" className="h-full w-full">
            {DESENHOS[item.figura]}
          </svg>
        </div>
      ))}
    </div>
  );
}
