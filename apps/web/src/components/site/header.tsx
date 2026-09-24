"use client";

import { ExternalLink, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MENU } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <Link href="/" aria-label="FAPERON – página inicial" className="flex shrink-0 items-center gap-1">
          <Image src="/marca-faperon.png" alt="" width={56} height={56} priority className="-m-1.5 h-14 w-14" />
          <span>
            <span className="block text-[1.35rem] font-bold leading-none tracking-tight text-brand">FAPERON</span>
            <span className="mt-0.5 block max-w-[11rem] text-[0.7rem] leading-tight text-ink-muted">
              Federação da Agricultura e Pecuária de Rondônia
            </span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden xl:block">
          <ul className="flex items-center">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  {...(item.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-current={!item.externo && ativo(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1 whitespace-nowrap border-b-[3px] border-transparent px-3 py-2 text-sm font-medium text-ink hover:text-brand",
                    !item.externo && ativo(item.href) && "border-brand-light text-brand",
                  )}
                >
                  {item.label}
                  {item.externo && (
                    <>
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      <span className="sr-only"> (abre o site atual em nova aba)</span>
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-brand-soft xl:hidden"
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {aberto && (
        <nav id="menu-mobile" aria-label="Principal (móvel)" className="border-t border-line bg-white xl:hidden">
          <ul className="container flex flex-col py-2">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setAberto(false)}
                  {...(item.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-current={!item.externo && ativo(item.href) ? "page" : undefined}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-brand-soft aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand"
                >
                  {item.label}
                  {item.externo && (
                    <>
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      <span className="sr-only"> (abre o site atual em nova aba)</span>
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
