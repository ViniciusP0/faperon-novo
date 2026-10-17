import Image from "next/image";
import { POSES, type Pose } from "@/content/zetele";
import { cn } from "@/lib/utils";

const ORDEM: Pose[] = ["acenando", "tablet", "apontando"];

/** As três poses ficam carregadas e empilhadas; trocar de pose é só opacidade (sem piscar). */
export function Personagem({ pose, className }: { pose: Pose; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative block", className)}>
      {ORDEM.map((p) => (
        <Image
          key={p}
          src={POSES[p]}
          alt=""
          fill
          sizes="80px"
          data-pose={p}
          data-ativa={p === pose}
          className={cn(
            "object-contain object-bottom transition-opacity duration-[var(--mov-rapido)] motion-reduce:transition-none",
            p === pose ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </span>
  );
}
