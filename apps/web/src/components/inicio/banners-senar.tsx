"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import type { BannerSenar } from "@/content/senar";
import { cn } from "@/lib/utils";
import { useCarrossel } from "./use-carrossel";

const seta =
  "absolute top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#14261f] shadow-lg ring-1 ring-black/10 transition-colors hover:bg-card focus-visible:outline-offset-2 md:h-12 md:w-12";

interface BannersSenarProps {
  banners: readonly BannerSenar[];
  rotulo: string;
  url: string;
}

export function BannersSenar({ banners, rotulo, url }: BannersSenarProps) {
  const total = banners.length;
  const { atual, ir, girando, rotacaoLigada, alternarRotacao, gestos } = useCarrossel(total);

  return (
    <section aria-roledescription="carrossel" aria-label={rotulo} {...gestos}>
      <div className="relative overflow-hidden rounded-2xl bg-brand-dark">
        <div className="grid" aria-live={girando ? "off" : "polite"}>
          {banners.map((b, i) => (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}`}
              aria-hidden={i !== atual}
              className={cn(
                "col-start-1 row-start-1 transition-[opacity,visibility] duration-500 motion-reduce:transition-none",
                i === atual ? "opacity-100" : "invisible opacity-0",
              )}
            >
              <a href={url} target="_blank" rel="noopener noreferrer" className="block focus-visible:outline-offset-[-4px]">
                <Image
                  src={b.imagem}
                  alt={b.alt}
                  width={b.largura}
                  height={b.altura}
                  unoptimized
                  sizes="(min-width: 1200px) 1152px, 100vw"
                  className="aspect-[7/3] w-full object-cover"
                />
                <span className="sr-only"> (abre o site do Sistema FAPERON/SENAR em nova aba)</span>
              </a>
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            <button type="button" className={cn(seta, "left-3 md:left-4")} aria-label="Banner anterior" onClick={() => ir(atual - 1)}>
              <ChevronLeft aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <button type="button" className={cn(seta, "right-3 md:right-4")} aria-label="Próximo banner" onClick={() => ir(atual + 1)}>
              <ChevronRight aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Ir para o banner ${i + 1}`}
              aria-current={i === atual}
              onClick={() => ir(i)}
              className="group inline-flex h-8 w-7 items-center justify-center rounded-full"
            >
              <span
                aria-hidden="true"
                className={cn("block h-3 rounded-full transition-all group-hover:bg-brand-dark", i === atual ? "w-7 bg-brand" : "w-3 bg-[#7d9086]")}
              />
            </button>
          ))}
          <button
            type="button"
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink ring-1 ring-line transition-colors hover:bg-brand-soft"
            aria-label={rotacaoLigada ? "Pausar rotação automática" : "Retomar rotação automática"}
            onClick={alternarRotacao}
          >
            {rotacaoLigada ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      )}
    </section>
  );
}
