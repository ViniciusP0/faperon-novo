import type { ReactNode } from "react";
import { COR_TIPO, LEGENDA, tiposPresentes } from "@/lib/sistema/legenda";
import type { TipoLegenda } from "@/lib/sistema/tipos";
import { cn } from "@/lib/utils";

/** Selo do tipo, na cor da legenda única: texto forte sobre o fundo suave. O texto pode ser o rótulo do módulo. */
export function SeloDeTipo({ tipo, children, className }: { tipo: TipoLegenda; children?: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0 text-xs font-medium", COR_TIPO[tipo].fundo, COR_TIPO[tipo].texto, className)}>
      {children ?? LEGENDA[tipo]}
    </span>
  );
}

/** Legenda das cores: mostra só os tipos presentes na tela, na ordem do catálogo. */
export function LegendaDeTipos({ tipos, className }: { tipos: Iterable<TipoLegenda>; className?: string }) {
  const presentes = tiposPresentes(tipos);
  if (presentes.length === 0) return null;
  return (
    <ul aria-label="Cores por tipo" className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted", className)}>
      {presentes.map((t) => (
        <li key={t} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-sm", COR_TIPO[t].ponto)} />
          {LEGENDA[t]}
        </li>
      ))}
    </ul>
  );
}
