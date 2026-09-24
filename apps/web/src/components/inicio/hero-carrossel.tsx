"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCarrossel } from "./use-carrossel";

export interface SlideHero {
  id: string;
  titulo: string;
  conteudo: ReactNode;
}

const seta =
  "absolute bottom-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg ring-1 ring-black/10 transition-colors hover:bg-white focus-visible:outline-offset-2 xl:bottom-auto xl:top-1/2 xl:h-12 xl:w-12 xl:-translate-y-1/2";

export function HeroCarrossel({ slides, rotulo }: { slides: SlideHero[]; rotulo: string }) {
  const total = slides.length;
  const { atual, ir, girando, rotacaoLigada, alternarRotacao, gestos } = useCarrossel(total);

  return (
    <section
      aria-roledescription="carrossel"
      aria-label={rotulo}
      className="relative overflow-hidden"
      {...gestos}
    >
      <div className="grid" aria-live={girando ? "off" : "polite"}>
        {slides.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== atual}
            className={cn(
              "col-start-1 row-start-1 transition-[opacity,visibility] duration-500 motion-reduce:transition-none [&>*]:h-full",
              i === atual ? "opacity-100" : "invisible opacity-0",
            )}
          >
            {s.conteudo}
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className={cn(seta, "left-4 md:left-6 xl:left-[max(0.5rem,calc((100vw-1200px)/2-3.5rem))]")}
            aria-label="Slide anterior"
            onClick={() => ir(atual - 1)}
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
          </button>
          <button
            type="button"
            className={cn(seta, "right-4 md:right-6 xl:right-[max(0.5rem,calc((100vw-1200px)/2-3.5rem))]")}
            aria-label="Próximo slide"
            onClick={() => ir(atual + 1)}
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-1">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Ir para o slide ${i + 1}: ${s.titulo}`}
                  aria-current={i === atual}
                  onClick={() => ir(i)}
                  className="group inline-flex h-8 w-7 items-center justify-center rounded-full focus-visible:outline-offset-0"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-3 rounded-full ring-2 ring-white shadow-sm transition-all group-hover:bg-brand-dark",
                      i === atual ? "w-7 bg-brand" : "w-3 bg-[#8a9c92]",
                    )}
                  />
                </button>
              ))}
              <button
                type="button"
                className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-md ring-1 ring-black/10 transition-colors hover:bg-brand-soft focus-visible:outline-offset-0"
                aria-label={rotacaoLigada ? "Pausar rotação automática" : "Retomar rotação automática"}
                onClick={alternarRotacao}
              >
                {rotacaoLigada ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
