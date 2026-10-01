import { ExternalLink } from "lucide-react";
import Image from "next/image";

interface SlideImagemProps {
  imagem: string;
  posicao: string;
  titulo: string;
  texto: string;
  ctaTexto: string;
  ctaUrl: string;
  etiqueta?: string;
  prioridade?: boolean;
}

export function SlideImagem({ imagem, posicao, titulo, texto, ctaTexto, ctaUrl, etiqueta, prioridade = false }: SlideImagemProps) {
  return (
    <div className="relative flex min-h-[max(560px,calc(100svh-7.75rem))] items-center overflow-hidden bg-brand-dark text-white">
      <Image
        src={imagem}
        alt=""
        fill
        unoptimized
        priority={prioridade}
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: posicao }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: "linear-gradient(90deg, rgba(0,70,58,.96) 0%, rgba(0,70,58,.86) 45%, rgba(0,70,58,.35) 75%, rgba(0,70,58,.1) 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ backgroundImage: "linear-gradient(0deg, rgba(0,70,58,.7), rgba(0,70,58,0))" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2/5"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(0,70,58,.88), rgba(0,70,58,0))" }}
      />
      <div className="container relative pb-24 pt-14 md:pb-28">
        <div className="max-w-xl">
          {etiqueta && (
            <p className="mb-4 inline-block rounded-full bg-white/15 px-3.5 py-1 text-sm font-medium backdrop-blur-sm">{etiqueta}</p>
          )}
          <h2 className="text-3xl font-semibold leading-[1.12] tracking-tight md:text-5xl">{titulo}</h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-white/90">{texto}</p>
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-lime px-7 font-medium text-brand-dark transition-colors hover:bg-[#9bdc60]"
          >
            {ctaTexto}
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
