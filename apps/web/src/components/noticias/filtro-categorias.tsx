import Link from "next/link";
import { hrefLista, type OpcaoCategoria } from "@/lib/noticias-lista";
import { cn } from "@/lib/utils";

const chip = "inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors";

/** Chips de categoria: links comuns para a URL filtrada, então funcionam sem JavaScript e podem ser compartilhados. */
export function FiltroCategorias({ opcoes, ativa, total }: { opcoes: OpcaoCategoria[]; ativa: string | null; total: number }) {
  if (opcoes.length === 0) return null;
  const itens = [{ slug: null, nome: "Todas", total }, ...opcoes.map((o) => ({ slug: o.slug as string | null, nome: o.nome, total: o.total }))];
  return (
    <nav aria-label="Filtrar por categoria">
      <ul className="flex flex-wrap gap-2">
        {itens.map((item) => {
          const selecionado = item.slug === ativa;
          return (
            <li key={item.slug ?? "todas"}>
              <Link
                href={hrefLista({ categoria: item.slug })}
                aria-current={selecionado ? "page" : undefined}
                className={cn(
                  chip,
                  selecionado
                    ? "border-brand bg-brand text-white dark:border-brand-lime dark:bg-brand-lime dark:text-brand-dark"
                    : "border-line bg-card text-ink hover:border-brand-fg hover:text-brand-fg",
                )}
              >
                {item.nome} ({item.total})
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
