import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { hrefLista } from "@/lib/noticias-lista";
import { cn } from "@/lib/utils";

const base = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium";
const comum = "border-line bg-card text-ink hover:border-brand-fg hover:text-brand-fg";

/** Paginação por links (?pagina=N), que preservam a categoria. Não aparece quando há uma página só. */
export function Paginacao({ pagina, totalPaginas, categoria }: { pagina: number; totalPaginas: number; categoria: string | null }) {
  if (totalPaginas <= 1) return null;
  const href = (p: number) => hrefLista({ categoria, pagina: p });
  return (
    <nav aria-label="Paginação" className="mt-10">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {pagina > 1 && (
          <li>
            <Link href={href(pagina - 1)} aria-label="Página anterior" className={cn(base, comum)}>
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </Link>
          </li>
        )}
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
          <li key={p}>
            {p === pagina ? (
              <span aria-current="page" className={cn(base, "border-brand bg-brand text-white")}>
                {p}
              </span>
            ) : (
              <Link href={href(p)} aria-label={`Página ${p}`} className={cn(base, comum)}>
                {p}
              </Link>
            )}
          </li>
        ))}
        {pagina < totalPaginas && (
          <li>
            <Link href={href(pagina + 1)} aria-label="Próxima página" className={cn(base, comum)}>
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
