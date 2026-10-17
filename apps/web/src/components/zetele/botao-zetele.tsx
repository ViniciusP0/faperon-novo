import { forwardRef } from "react";
import { ZETELE, type Pose } from "@/content/zetele";
import { Personagem } from "./personagem";

interface Props {
  aberto: boolean;
  pose: Pose;
  onClick: () => void;
}

export const BotaoZetele = forwardRef<HTMLButtonElement, Props>(function BotaoZetele({ aberto, pose, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={ZETELE.rotuloBotao}
      aria-haspopup="dialog"
      aria-expanded={aberto}
      aria-controls="zetele-painel"
      className="group relative block h-60 w-[9.375rem] sm:h-[22.5rem] sm:w-[14.0625rem] rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {/* no tema escuro a arte (cores fixas) pousa num disco para não parecer recortada */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[7.5rem] sm:h-[11.25rem] rounded-full bg-surface-alt dark:block" />
      <Personagem
        pose={pose}
        className="h-full w-full drop-shadow-md transition-transform duration-[var(--mov-rapido)] group-hover:-translate-y-0.5 motion-reduce:transform-none"
      />
    </button>
  );
});
