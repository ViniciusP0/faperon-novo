"use client";

import { LogOut, RotateCcw, UserRoundCog } from "lucide-react";
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
  { href: "/sistema/contas", rotulo: "Contas" },
  { href: "/sistema/atividades", rotulo: "Atividades" },
  { href: "/sistema/relatorios", rotulo: "Relatórios" },
];

const acao =
  "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium sm:min-h-0 text-ink-muted transition duration-150 ease-out hover:bg-white/60 hover:text-ink dark:hover:bg-white/5";

/** Barra do sistema em vidro, fixa sob o cabeçalho do site: o conteúdo rola por trás dela. */
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
    <div className="vidro-barra z-30 md:sticky md:top-[72px] print:hidden">
      <div className="container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5">
        <nav aria-label="Seções do sistema">
          <ul className="flex flex-wrap gap-1">
            {SECOES.map((s) => {
              const ativa = caminho === s.href;
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={ativa ? "page" : undefined}
                    className={cn(
                      "inline-flex rounded-lg px-3 py-1.5 text-sm font-medium transition duration-150 ease-out",
                      ativa ? "vidro-claro" : "text-ink-muted hover:bg-white/60 hover:text-ink dark:hover:bg-white/5",
                    )}
                  >
                    {s.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {funcionario && (
            <span className="mr-2 text-ink">
              <span className="sr-only">Logado como </span>
              <strong className="font-semibold">{funcionario.nome}</strong> <span className="text-ink-muted">· {funcionario.area}</span>
            </span>
          )}
          <button type="button" onClick={restaurar} className={acao} title="Volta agenda, frota e espaços aos dados de exemplo">
            <RotateCcw aria-hidden="true" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="sr-only sm:not-sr-only">{PROTOTIPO.restaurar}</span>
          </button>
          {funcionario && (
            <button type="button" onClick={trocar} className={acao}>
              <UserRoundCog aria-hidden="true" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="sr-only sm:not-sr-only">Trocar de funcionário</span>
            </button>
          )}
          {funcionario && (
            <button type="button" onClick={sairDoSistema} className={acao}>
              <LogOut aria-hidden="true" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="sr-only sm:not-sr-only">Sair</span>
            </button>
          )}
        </div>
      </div>
      <p role="note" className="border-t border-line py-1 text-center text-[11px] font-medium tracking-wide text-ink-muted">
        {PROTOTIPO.faixa}
      </p>
    </div>
  );
}
