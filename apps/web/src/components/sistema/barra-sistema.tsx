"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PROTOTIPO } from "@/content/sistema/funcionarios";
import { useSistema } from "@/lib/sistema/estado";
import { cn } from "@/lib/utils";

const SECOES = [
  { href: "/sistema", rotulo: "Início do sistema" },
  { href: "/sistema/agenda", rotulo: "Agenda" },
  { href: "/sistema/frotas", rotulo: "Frotas" },
  { href: "/sistema/espacos", rotulo: "Espaços" },
];

/** Barra do sistema: faixa de protótipo, quem está logado, navegação e ações. */
export function BarraSistema() {
  const { funcionario, sair, encerrar, restaurar } = useSistema();
  const caminho = usePathname();
  const router = useRouter();

  function trocar() {
    sair();
    router.push("/login");
  }

  function sairDoSistema() {
    encerrar();
    router.push("/login");
  }

  return (
    <div className="border-b border-line bg-card">
      <p role="note" className="bg-warm/30 px-4 py-1.5 text-center text-xs font-medium text-ink">
        {PROTOTIPO.faixa}
      </p>
      <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
        <nav aria-label="Seções do sistema">
          <ul className="flex flex-wrap gap-1">
            {SECOES.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={caminho === s.href ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-brand-soft hover:text-brand-strong",
                    caminho === s.href && "bg-brand-soft text-brand-strong",
                  )}
                >
                  {s.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {funcionario && (
            <span className="text-ink">
              <span className="sr-only">Logado como </span>
              <strong>{funcionario.nome}</strong> <span className="text-ink-muted">· {funcionario.area}</span>
            </span>
          )}
          <button type="button" onClick={restaurar} className="rounded-lg px-2 py-1 text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            {PROTOTIPO.restaurar}
          </button>
          {funcionario && (
            <button type="button" onClick={trocar} className="rounded-lg border border-line px-3 py-1 font-medium text-brand-fg hover:bg-brand-soft">
              Trocar de funcionário
            </button>
          )}
          {funcionario && (
            <button type="button" onClick={sairDoSistema} className="rounded-lg px-3 py-1 font-medium text-ink-muted hover:bg-surface-alt hover:text-ink">
              Sair
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
