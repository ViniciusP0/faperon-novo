"use client";

import { SendHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type RefObject } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ROTAS } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ZETELE, type PerguntaPronta, type Pose } from "@/content/zetele";
import { Chips } from "./chips";
import { Mensagens, type Mensagem } from "./mensagens";
import { Personagem } from "./personagem";

interface Props {
  pose: Pose;
  mensagens: Mensagem[];
  carregando: boolean;
  disponivel: boolean;
  espera: number;
  mostrarChips: boolean;
  visiveis: PerguntaPronta[];
  demais: PerguntaPronta[];
  campoRef: RefObject<HTMLTextAreaElement | null>;
  fecharRef: RefObject<HTMLButtonElement | null>;
  onFechar: () => void;
  onEnviar: (texto: string) => void;
  onEscolher: (p: PerguntaPronta) => void;
  onMostrarChips: () => void;
}

export function PainelZetele(p: Props) {
  const [texto, setTexto] = useState("");
  const bloqueado = p.carregando || !p.disponivel || p.espera > 0;

  function enviar(e?: FormEvent) {
    e?.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || bloqueado) return;
    p.onEnviar(pergunta);
    setTexto("");
  }

  return (
    <div
      id="zetele-painel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="zetele-titulo"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          p.onFechar();
        }
      }}
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[80dvh] flex-col rounded-t-2xl border border-line bg-card text-ink shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-[13.25rem] sm:max-h-[min(80dvh,600px)] sm:w-[360px] sm:rounded-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Personagem pose={p.pose} className="h-12 w-8 shrink-0" />
        <h2 id="zetele-titulo" className="flex-1 text-base font-semibold text-brand-strong">
          {ZETELE.nome}
        </h2>
        <button
          ref={p.fecharRef}
          type="button"
          onClick={p.onFechar}
          aria-label={ZETELE.fechar}
          className="rounded-lg p-2 text-ink-muted hover:bg-surface-alt hover:text-ink"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-sm text-ink-muted">{ZETELE.boasVindas}</p>
        <Mensagens mensagens={p.mensagens} onTentarDeNovo={p.onEnviar} />
        {p.carregando && (
          <p role="status" className="mt-3 text-sm text-ink-muted">
            {ZETELE.consultando}
          </p>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        {p.mostrarChips ? (
          <Chips visiveis={p.visiveis} demais={p.demais} soEstaticas={!p.disponivel} onEscolher={p.onEscolher} />
        ) : (
          <button type="button" onClick={p.onMostrarChips} className="text-xs font-medium text-brand-fg underline">
            {ZETELE.sugestoes}
          </button>
        )}
        {!p.disponivel && <p className="mt-2 text-xs text-ink-muted">{ZETELE.indisponivel}</p>}
        {p.espera > 0 && (
          <p role="status" className="mt-2 text-xs text-ink-muted">
            {ZETELE.espera(p.espera)}
          </p>
        )}
        <form onSubmit={enviar} className="mt-3 flex items-end gap-2">
          <label htmlFor="zetele-campo" className="sr-only">
            {ZETELE.rotuloCampo}
          </label>
          <textarea
            id="zetele-campo"
            ref={p.campoRef}
            rows={2}
            maxLength={ZETELE.tamanhoMaximo}
            value={texto}
            disabled={!p.disponivel}
            placeholder={ZETELE.placeholder}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand-fg focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={bloqueado || !texto.trim()}
            aria-label={ZETELE.enviar}
            className={cn(buttonVariants(), "h-auto shrink-0 p-2.5")}
          >
            <SendHorizontal aria-hidden="true" className="h-5 w-5" />
          </button>
        </form>
        {texto.length > 400 && (
          <p className="mt-1 text-right text-xs text-ink-muted">
            {texto.length}/{ZETELE.tamanhoMaximo}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-snug text-ink-muted">
          {ZETELE.avisoPrivacidade}{" "}
          <Link href={ROTAS.privacidade} className="underline">
            {ZETELE.politica}
          </Link>
        </p>
      </div>
    </div>
  );
}
