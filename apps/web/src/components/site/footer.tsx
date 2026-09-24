import Image from "next/image";
import Link from "next/link";
import { LINKS_INSTITUCIONAIS, MENU } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-brand-dark text-white">
      <div className="container grid gap-10 py-12 md:grid-cols-3">
        <div>
          <Image src="/logo-faperon-branca.png" alt="FAPERON" width={172} height={44} className="h-10 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/90">
            Federação da Agricultura e Pecuária do Estado de Rondônia. Representação, inteligência e apoio ao produtor rural.
          </p>
        </div>
        <nav aria-label="Rodapé: navegação">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-lime">Navegação</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  {...(item.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="underline-offset-4 hover:underline focus-visible:outline-white"
                >
                  {item.label}
                  {item.externo && <span className="sr-only"> (abre o site atual em nova aba)</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Rodapé: institucional">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-lime">Institucional</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {LINKS_INSTITUCIONAIS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:underline focus-visible:outline-white"
                >
                  {item.label}
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/20">
        <p className="container py-4 text-xs text-white/85">
          Protótipo em avaliação. Dados do painel: IBGE (SIDRA). O site atual da FAPERON continua no ar.
        </p>
      </div>
    </footer>
  );
}
