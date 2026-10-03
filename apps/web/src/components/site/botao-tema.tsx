"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { aplicarTema, salvarTema, temaAtual, type Tema } from "@/lib/tema";
import { cn } from "@/lib/utils";

export function BotaoTema({ className }: { className?: string }) {
  const [tema, setTema] = useState<Tema | null>(null);

  // O servidor sempre entrega o tema claro; um script do <head> reaplica a escolha guardada (ver lib/tema.ts). O estado
  // só é lido depois da hidratação, para o botão não divergir do HTML do servidor.
  useEffect(() => setTema(temaAtual()), []);

  const escuro = tema === "escuro";
  const alternar = () => {
    const proximo: Tema = escuro ? "claro" : "escuro";
    aplicarTema(proximo);
    salvarTema(proximo);
    setTema(proximo);
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      aria-label="Tema escuro"
      title={escuro ? "Voltar ao tema claro" : "Ativar tema escuro"}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink transition-colors hover:border-brand-fg hover:text-brand-fg motion-reduce:transition-none",
        className,
      )}
    >
      {escuro ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}
    </button>
  );
}
