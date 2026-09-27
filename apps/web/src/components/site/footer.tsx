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
        <div className="container flex flex-col items-center justify-between gap-4 py-4 text-xs text-white/85 sm:flex-row">
          <p>Protótipo em avaliação. Dados do painel: IBGE (SIDRA). O site atual da FAPERON continua no ar.</p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm">Desenvolvido por DATA-RO Inteligência Territorial</span>
            <span className="inline-flex items-center rounded-lg bg-white px-1.5 py-1 shadow-sm">
              <Image src="/logo-dataro.png" alt="DATA-RO – Inteligência Territorial" width={80} height={100} className="h-16 w-auto" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
