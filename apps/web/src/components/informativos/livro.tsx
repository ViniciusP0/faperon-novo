import type { CSSProperties } from "react";
import { type LivroInfo, textosDaCapa } from "@/lib/informativos";
import { cn } from "@/lib/utils";

const TAMANHOS = { sm: "livro-sm", md: "", lg: "livro-lg" } as const;

interface LivroProps {
  livro: LivroInfo;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
  style?: CSSProperties;
}

/** Livro em 3D (capa, lombada, corte das páginas e sombra). Decorativo: o botão ou link ao redor carrega o nome acessível. */
export function Livro({ livro, tamanho = "md", className, style }: LivroProps) {
  const t = textosDaCapa(livro);
  return (
    <div aria-hidden="true" className={cn("livro", `livro-tema-${livro.tipo}`, TAMANHOS[tamanho], className)} style={style}>
      <div className="livro__fundo" />
      <div className="livro__paginas" />
      <div className="livro__lombada">
        <span>{t.lombada}</span>
      </div>
      <div className="livro__capa">
        <div className="livro__arcos" />
        <div className="livro__selo">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícone decorativo pequeno, sem otimização necessária */}
          <img src="/marca-faperon.png" alt="" />
          FAPERON
        </div>
        <div className="livro__tipo">
          {t.tipo}
          <br />
          {livro.categoria}
        </div>
        <div className="livro__mes">{t.mes}</div>
        <div className="livro__ano">{t.ano}</div>
        <div className="livro__barra" />
      </div>
      <div className="livro__sombra" />
    </div>
  );
}
