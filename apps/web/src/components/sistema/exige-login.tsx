"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { useSistema } from "@/lib/sistema/estado";

/** Conteúdo do sistema só com alguém logado; sem sessão, manda escolher um funcionário. */
export function ExigeLogin({ children }: { children: ReactNode }) {
  const { pronto, funcionario } = useSistema();
  if (!pronto) return <Skeleton className="h-64 w-full" />;
  if (!funcionario) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">Escolha um funcionário para entrar</h1>
        <p className="mt-2 text-sm text-ink-muted">O protótipo do sistema abre com um funcionário de exemplo.</p>
        <Link href="/login" className={buttonVariants({ className: "mt-5" })}>
          Ir para Acessar o sistema
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
