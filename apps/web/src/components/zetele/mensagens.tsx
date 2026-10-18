import { LoaderCircle, Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ZETELE, ZETELE_VOZ } from "@/content/zetele";
import { cn } from "@/lib/utils";
import { ehRotaInterna, partesDoTexto, type FonteZetele } from "@/lib/zetele";

export interface Mensagem {
  id: number;
  autor: "visitante" | "zetele";
  texto: string;
  fontes?: FonteZetele[];
  link?: { href: string; rotulo: string };
  /** Presente quando a resposta falhou: o botão "Tentar de novo" reenvia esta pergunta. */
  perguntaOriginal?: string;
  /** Resposta de verdade (não aviso nem erro): pode ser lida em voz alta. */
  falavel?: boolean;
}

/** Botão "Ouvir" de cada resposta; ausente quando a voz do sistema não fala. */
export interface OuvirMensagens {
  tocando: number | null;
  preparando: number | null;
  onOuvir: (m: Mensagem) => void;
  onParar: () => void;
}

function BotaoOuvir({ m, ouvir }: { m: Mensagem; ouvir: OuvirMensagens }) {
  const tocando = ouvir.tocando === m.id;
  const preparando = ouvir.preparando === m.id;
  const ativo = tocando || preparando;
  // alto-falante para ouvir; girando enquanto o áudio é gerado; quadrado para parar
  const Icone = preparando ? LoaderCircle : tocando ? Square : Volume2;
  return (
    <button
      type="button"
      onClick={() => (ativo ? ouvir.onParar() : ouvir.onOuvir(m))}
      aria-label={ativo ? ZETELE_VOZ.pararRotulo : ZETELE_VOZ.ouvirRotulo}
      aria-busy={preparando || undefined}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-brand-fg hover:bg-surface-alt"
    >
      <Icone aria-hidden="true" className={cn("h-4 w-4 shrink-0", preparando && "animate-spin motion-reduce:animate-none")} />
      {ativo ? ZETELE_VOZ.parar : ZETELE_VOZ.ouvir}
    </button>
  );
}

const estiloLink = "font-medium text-brand-fg underline underline-offset-2";

function LinkZetele({ href, children }: { href: string; children: ReactNode }) {
  if (ehRotaInterna(href)) {
    return (
      <Link href={href} className={estiloLink}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={estiloLink}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function TextoComLinks({ texto }: { texto: string }) {
  return (
    <p>
      {partesDoTexto(texto).map((p, i) =>
        p.tipo === "link" ? (
          <LinkZetele key={i} href={p.href}>
            {p.texto}
          </LinkZetele>
        ) : (
          <Fragment key={i}>{p.texto}</Fragment>
        ),
      )}
    </p>
  );
}

function CartaoFonte({ fonte }: { fonte: FonteZetele }) {
  return (
    <div className="mt-2 rounded-xl border border-line bg-surface-alt px-3 py-2 text-xs text-ink-muted">
      <p>
        <span className="font-semibold text-ink">{ZETELE.fonte}:</span>{" "}
        <LinkZetele href={fonte.url_fonte}>{fonte.rotulo}</LinkZetele>
      </p>
      {fonte.url_interna && (
        <p className="mt-1">
          <LinkZetele href={fonte.url_interna}>{ZETELE.abrirConsulta}</LinkZetele>
        </p>
      )}
    </div>
  );
}

export function Mensagens({
  mensagens,
  onTentarDeNovo,
  ouvir,
}: {
  mensagens: Mensagem[];
  onTentarDeNovo: (pergunta: string) => void;
  ouvir?: OuvirMensagens;
}) {
  return (
    <ol aria-live="polite" aria-relevant="additions" className="flex flex-col gap-3">
      {mensagens.map((m) => (
        <li
          key={m.id}
          className={cn(
            "max-w-[90%] rounded-2xl px-3 py-2 text-sm text-ink",
            m.autor === "visitante" ? "self-end bg-brand-soft" : "self-start border border-line bg-card",
          )}
        >
          <span className="sr-only">{m.autor === "visitante" ? "Você: " : "Zétele: "}</span>
          <TextoComLinks texto={m.texto} />
          {m.link && (
            <p className="mt-2">
              <LinkZetele href={m.link.href}>{m.link.rotulo}</LinkZetele>
            </p>
          )}
          {m.fontes?.map((f) => <CartaoFonte key={`${f.url_fonte}|${f.url_interna}`} fonte={f} />)}
          {m.perguntaOriginal && (
            <button
              type="button"
              onClick={() => onTentarDeNovo(m.perguntaOriginal!)}
              className="mt-2 rounded-lg border border-line px-2 py-1 text-xs font-medium text-brand-fg hover:bg-surface-alt"
            >
              {ZETELE.tentarDeNovo}
            </button>
          )}
          {ouvir && m.autor === "zetele" && m.falavel && <BotaoOuvir m={m} ouvir={ouvir} />}
        </li>
      ))}
    </ol>
  );
}
