"use client";

import { Mic, SendHorizontal, Square, X } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type RefObject } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ROTAS } from "@/lib/site";
import { cn } from "@/lib/utils";
import { TEXTOS_DA_AREA, ZETELE, ZETELE_VOZ, type AreaZetele, type PerguntaPronta, type Pose } from "@/content/zetele";
import { ouvirAudio, type EstadoVoz } from "@/lib/zetele";
import { Chips } from "./chips";
import { Mensagens, type Mensagem, type OuvirMensagens } from "./mensagens";
import { Personagem } from "./personagem";
import { suportaGravacao, textoDoErroDaVoz, useGravador } from "./voz";

interface Props {
  pose: Pose;
  mensagens: Mensagem[];
  carregando: boolean;
  disponivel: boolean;
  area: AreaZetele;
  /** Início: só orientação, sem perguntas de dados. */
  soOrientacao: boolean;
  espera: number;
  mostrarChips: boolean;
  visiveis: PerguntaPronta[];
  demais: PerguntaPronta[];
  campoRef: RefObject<HTMLTextAreaElement | null>;
  fecharRef: RefObject<HTMLButtonElement | null>;
  onFechar: () => void;
  /** `porVoz`: a pergunta veio do microfone, então a resposta é lida em voz alta. */
  onEnviar: (texto: string, porVoz?: boolean) => void;
  onEscolher: (p: PerguntaPronta) => void;
  onMostrarChips: () => void;
  onOcultarChips: () => void;
  /** Voz do Zétele do sistema (ADR 0034); ausente no site público ou sem fornecedor. */
  pagina?: string;
  voz?: EstadoVoz | null;
  ouvir?: OuvirMensagens;
  responderEmVoz?: boolean;
  onResponderEmVoz?: (ligado: boolean) => void;
  avisoVoz?: string | null;
  onAvisoVoz?: (mensagem: string | null) => void;
  /** Chamado num toque da pessoa, para o navegador deixar tocar a resposta depois. */
  onPrepararAudio?: () => void;
}

const relogio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function PainelZetele(p: Props) {
  const [texto, setTexto] = useState("");
  const [porVoz, setPorVoz] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [suporta] = useState(suportaGravacao);
  const bloqueado = p.carregando || !p.disponivel || p.espera > 0;
  const avisar = (m: string | null) => p.onAvisoVoz?.(m);
  const gravador = useGravador({ onPronto: (audio) => void transcrever(audio), onErro: avisar });
  const gravando = gravador.estado === "gravando";
  const podeGravar = Boolean(p.voz?.ouvir) && suporta && p.disponivel;
  const comVoz = podeGravar || Boolean(p.voz?.falar);
  const statusVoz = gravando ? ZETELE_VOZ.gravando : transcrevendo ? ZETELE_VOZ.transcrevendo : (p.avisoVoz ?? "");

  async function transcrever(audio: Blob) {
    setTranscrevendo(true);
    const r = await ouvirAudio(audio, p.pagina ?? "/sistema");
    setTranscrevendo(false);
    if (r.tipo === "ok") {
      setTexto(r.texto.slice(0, ZETELE.tamanhoMaximo));
      setPorVoz(true);
      avisar(ZETELE_VOZ.confira);
      p.campoRef.current?.focus();
      return;
    }
    if (r.tipo === "nao_entendi") avisar(ZETELE_VOZ.erros.naoEntendi);
    else if (r.tipo === "recusado") avisar(ZETELE_VOZ.erros.recusado);
    else avisar(textoDoErroDaVoz(r));
  }

  function alternarGravacao() {
    p.onPrepararAudio?.();
    if (gravando) {
      gravador.parar();
      return;
    }
    avisar(null);
    void gravador.iniciar();
  }

  function enviar(e?: FormEvent) {
    e?.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || bloqueado) return;
    p.onPrepararAudio?.();
    p.onEnviar(pergunta, porVoz);
    setTexto("");
    setPorVoz(false);
    avisar(null);
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
          // gravando, o Esc só cancela a gravação
          if (gravando) {
            gravador.cancelar();
            avisar(null);
            return;
          }
          p.onFechar();
        }
      }}
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[80dvh] flex-col rounded-t-2xl border border-line bg-card text-ink shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-[13.75rem] sm:max-h-[min(80dvh,600px)] sm:w-[360px] sm:rounded-2xl"
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

      {/* rolável pelo teclado: com os controles de voz, a conversa rola mesmo sem links (axe) */}
      <div
        tabIndex={0}
        role="region"
        aria-label={ZETELE.rotuloConversa}
        className="flex-1 overflow-y-auto px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-fg"
      >
        <p className="mb-3 text-sm text-ink-muted">{TEXTOS_DA_AREA[p.area].boasVindas}</p>
        <Mensagens mensagens={p.mensagens} onTentarDeNovo={(t) => p.onEnviar(t)} ouvir={p.ouvir} />
        {p.carregando && (
          <p role="status" className="mt-3 text-sm text-ink-muted">
            {ZETELE.consultando}
          </p>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        {p.mostrarChips ? (
          <Chips
            visiveis={p.visiveis}
            demais={p.demais}
            soEstaticas={!p.disponivel || p.soOrientacao}
            onEscolher={p.onEscolher}
            onOcultar={p.onOcultarChips}
          />
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
            placeholder={TEXTOS_DA_AREA[p.area].placeholder}
            onChange={(e) => {
              setTexto(e.target.value);
              if (!e.target.value.trim()) setPorVoz(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand-fg focus:outline-none disabled:opacity-60"
          />
          {podeGravar && (
            <button
              type="button"
              onClick={alternarGravacao}
              disabled={transcrevendo || gravador.estado === "pedindo" || (!gravando && bloqueado)}
              aria-label={gravando ? ZETELE_VOZ.pararGravacao : ZETELE_VOZ.gravar}
              className={cn(buttonVariants({ variant: gravando ? "primary" : "outline" }), "h-auto shrink-0 p-2.5", gravando && "animate-pulse motion-reduce:animate-none")}
            >
              {gravando ? <Square aria-hidden="true" className="h-5 w-5" /> : <Mic aria-hidden="true" className="h-5 w-5" />}
            </button>
          )}
          <button
            type="submit"
            disabled={bloqueado || !texto.trim()}
            aria-label={ZETELE.enviar}
            className={cn(buttonVariants(), "h-auto shrink-0 p-2.5")}
          >
            <SendHorizontal aria-hidden="true" className="h-5 w-5" />
          </button>
        </form>
        {comVoz && (
          <div className="mt-1 flex min-h-[1.25rem] items-start justify-between gap-2 text-xs text-ink-muted">
            <p role="status" className="flex-1">
              {statusVoz}
            </p>
            {gravando && (
              <span aria-hidden="true" className="shrink-0 font-medium tabular-nums text-brand-fg">
                {relogio(gravador.segundos)} / {relogio(ZETELE_VOZ.limiteSegundos)}
              </span>
            )}
          </div>
        )}
        {texto.length > 400 && (
          <p className="mt-1 text-right text-xs text-ink-muted">
            {texto.length}/{ZETELE.tamanhoMaximo}
          </p>
        )}
        {p.voz?.falar && (
          <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-ink">
            <input
              type="checkbox"
              role="switch"
              checked={Boolean(p.responderEmVoz)}
              onChange={(e) => {
                if (e.target.checked) p.onPrepararAudio?.();
                p.onResponderEmVoz?.(e.target.checked);
              }}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            {ZETELE_VOZ.responderEmVoz}
          </label>
        )}
        {comVoz && <p className="mt-2 text-[11px] leading-snug text-ink-muted">{ZETELE_VOZ.avisoPrototipo}</p>}
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
