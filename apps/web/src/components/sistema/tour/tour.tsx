"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TOUR } from "@/content/sistema/tour";
import { gravar, ler } from "@/lib/sistema/armazenamento";
import { cn } from "@/lib/utils";

const CHAVE_VISTO = "tour:visto";
const FOLGA = 8;
const LARGURA_CARTAO = 352;
// altura estimada do cartão e do cabeçalho fixo do site com a barra do sistema
const ALTURA_CARTAO = 320;
const TOPO_FIXO = 200;

interface ContextoTour {
  iniciar: () => void;
  ativo: boolean;
}

const Contexto = createContext<ContextoTour | null>(null);

export function useTour(): ContextoTour {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useTour fora do TourProvider");
  return ctx;
}

export function tourJaVisto(): boolean {
  return ler<boolean>(CHAVE_VISTO, false);
}

export function marcarTourVisto(): void {
  gravar(CHAVE_VISTO, true);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [indice, setIndice] = useState<number | null>(null);
  const iniciar = useCallback(() => setIndice(0), []);
  const fechar = useCallback(() => {
    marcarTourVisto();
    setIndice(null);
  }, []);
  return (
    <Contexto.Provider value={{ iniciar, ativo: indice != null }}>
      {children}
      {indice != null && <TourAtivo indice={indice} aoMudar={setIndice} aoFechar={fechar} />}
    </Contexto.Provider>
  );
}

const movimentoReduzido = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function TourAtivo({ indice, aoMudar, aoFechar }: { indice: number; aoMudar: (i: number) => void; aoFechar: () => void }) {
  const router = useRouter();
  const passo = TOUR[indice]!;
  const ultimo = indice === TOUR.length - 1;
  const [alvo, setAlvo] = useState<Element | null>(null);
  const [caixa, setCaixa] = useState<DOMRect | null>(null);
  const [procurando, setProcurando] = useState(true);
  const titulo = useRef<HTMLHeadingElement>(null);

  // abre a tela do passo
  useEffect(() => {
    const atual = window.location.pathname + window.location.search;
    if (atual !== passo.rota) router.push(passo.rota, { scroll: false });
  }, [passo.rota, router]);

  // espera o elemento aparecer (a tela pode estar carregando) e o traz para a vista
  useEffect(() => {
    setAlvo(null);
    setCaixa(null);
    setProcurando(true);
    if (!passo.alvo) {
      setProcurando(false);
      return;
    }
    let tentativas = 0;
    const id = window.setInterval(() => {
      const el = document.querySelector(`[data-tour="${passo.alvo}"]`);
      const pronto = el && window.location.pathname === passo.rota.split("?")[0];
      if (pronto) {
        window.clearInterval(id);
        // rola descontando o cabeçalho fixo; elemento alto fica com o topo à vista
        const r = el.getBoundingClientRect();
        const util = window.innerHeight - TOPO_FIXO;
        const destino = window.scrollY + r.top - (r.height > util * 0.7 ? TOPO_FIXO + 16 : TOPO_FIXO + (util - r.height) / 2);
        window.scrollTo({ top: Math.max(destino, 0), behavior: movimentoReduzido() ? "auto" : "smooth" });
        setAlvo(el);
        setProcurando(false);
      } else if (++tentativas > 40) {
        window.clearInterval(id);
        setProcurando(false);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [passo.alvo, passo.rota]);

  // acompanha o elemento enquanto a página rola ou muda de tamanho
  useLayoutEffect(() => {
    if (!alvo) return;
    let quadro = 0;
    const medir = () => {
      setCaixa(alvo.getBoundingClientRect());
      quadro = window.requestAnimationFrame(medir);
    };
    medir();
    return () => window.cancelAnimationFrame(quadro);
  }, [alvo]);

  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
  }, [indice]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const campo = (e.target as HTMLElement | null)?.closest("input, textarea, select");
      if (e.key === "Escape") aoFechar();
      else if (!campo && e.key === "ArrowRight" && !ultimo) aoMudar(indice + 1);
      else if (!campo && e.key === "ArrowLeft" && indice > 0) aoMudar(indice - 1);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [indice, ultimo, aoMudar, aoFechar]);

  if (typeof document === "undefined") return null;

  const largura = typeof window !== "undefined" ? window.innerWidth : 1280;
  const altura = typeof window !== "undefined" ? window.innerHeight : 800;
  const celular = largura < 640;
  // cartão abaixo do elemento se couber, senão acima; sem espaço (elemento alto), no canto inferior
  // esquerdo, longe do Zétele
  let posicao: React.CSSProperties | undefined;
  if (caixa && !celular) {
    const left = Math.min(Math.max(caixa.left, 16), largura - LARGURA_CARTAO - 16);
    if (altura - caixa.bottom - FOLGA >= ALTURA_CARTAO) posicao = { left, top: caixa.bottom + FOLGA + 12 };
    else if (caixa.top - FOLGA - TOPO_FIXO >= ALTURA_CARTAO) posicao = { left, bottom: altura - caixa.top + FOLGA + 12 };
    else posicao = { left: 24, bottom: 24 };
  }

  return createPortal(
    <>
      {/* destaque: o elemento real fica aceso, o resto escurece; não bloqueia o clique na página */}
      <div
        aria-hidden="true"
        className={cn("pointer-events-none fixed z-[70] rounded-2xl motion-safe:transition-[top,left,width,height] motion-safe:duration-300 motion-safe:ease-out", !caixa && "inset-0")}
        style={
          caixa
            ? {
                top: caixa.top - FOLGA,
                left: caixa.left - FOLGA,
                width: caixa.width + FOLGA * 2,
                height: caixa.height + FOLGA * 2,
                boxShadow: "0 0 0 2px var(--brand-lime), 0 0 0 9999px rgb(0 38 31 / 0.55)",
              }
            : { background: procurando ? "transparent" : "rgb(0 38 31 / 0.55)" }
        }
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-titulo"
        aria-describedby="tour-texto"
        className={cn(
          "fixed z-[71] w-[calc(100vw-2rem)] rounded-2xl bg-card p-5 text-ink shadow-[0_24px_60px_-20px_rgb(0_40_33/0.6)] sm:w-[22rem]",
          celular ? "inset-x-4 bottom-4 w-auto" : !posicao && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={posicao}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-brand-fg">
            {passo.secao} · passo {indice + 1} de {TOUR.length}
          </p>
          <button type="button" onClick={aoFechar} aria-label="Sair do tour" className="-mr-1 rounded-lg p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-brand-lime motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${((indice + 1) / TOUR.length) * 100}%` }} />
        </div>
        <h2 id="tour-titulo" ref={titulo} tabIndex={-1} className="mt-3 text-lg font-semibold tracking-[-0.02em] text-ink outline-none">
          {passo.titulo}
        </h2>
        <p id="tour-texto" className="mt-1 text-sm leading-relaxed text-ink-muted">
          {passo.texto}
        </p>
        {passo.passos && (
          <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-sm leading-relaxed text-ink marker:font-semibold marker:text-brand-fg">
            {passo.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        )}
        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => aoMudar(indice - 1)} disabled={indice === 0}>
            Voltar
          </Button>
          {ultimo ? (
            <Button variant="vidro" size="sm" onClick={aoFechar}>
              Concluir o tour
            </Button>
          ) : (
            <Button variant="vidro" size="sm" onClick={() => aoMudar(indice + 1)}>
              Próximo
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
