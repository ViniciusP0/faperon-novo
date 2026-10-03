import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ITENS = [
  { nome: "SENAR Rondônia", href: "https://sistemafaperon.org.br/", externo: true },
  { nome: "IPAGRO", href: "/ipagro" },
  { nome: "Sindicatos Rurais", href: "/sindicatos-rurais" },
  { nome: "Comissão Mulheres", href: "/comissao-mulheres" },
] as const;

/** Faixa de navegação entre as entidades do Sistema FAPERON, logo abaixo do Hero de cada página. */
export function NavSistema({ atual }: { atual: string }) {
  return (
    <nav aria-label="Sistema FAPERON" className="border-y border-line bg-surface-alt">
      <ul className="container flex flex-wrap items-center gap-2 py-3">
        <li className="mr-2 text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">Sistema FAPERON</li>
        {ITENS.map((i) => {
          const ativo = i.nome === atual;
          const classes = cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
            ativo ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:border-brand-fg hover:text-brand-fg",
          );
          return (
            <li key={i.nome}>
              {"externo" in i ? (
                <a href={i.href} target="_blank" rel="noopener noreferrer" className={classes}>
                  {i.nome}
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              ) : (
                <Link href={i.href} aria-current={ativo ? "page" : undefined} className={classes}>
                  {i.nome}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Lista de fontes consultadas: cada fato da página aponta para o texto original. */
export function Fontes({ fontes }: { fontes: readonly { rotulo: string; url: string }[] }) {
  return (
    <p className="mt-4 text-sm text-ink-muted">
      Fonte{fontes.length > 1 ? "s" : ""}:{" "}
      {fontes.map((f, i) => (
        <span key={f.url}>
          {i > 0 && " · "}
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-fg underline underline-offset-2 hover:no-underline">
            {f.rotulo}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </span>
      ))}
    </p>
  );
}
