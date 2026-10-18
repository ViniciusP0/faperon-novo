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
      data-tour="zetele"
      className="group pointer-events-none relative block h-[12.75rem] w-[7.96875rem] sm:h-[19.125rem] sm:w-[11.953125rem] rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {/* no tema escuro a arte (cores fixas) pousa num disco para não parecer recortada */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[6.375rem] sm:h-[9.5625rem] rounded-full bg-surface-alt dark:block" />
      {/* O retângulo do botão é quase todo transparente: só o corpo do personagem recebe o clique,
          para o resto não esconder botões da página atrás dele. O clique na área sobe para o botão. */}
      <span aria-hidden="true" data-testid="zetele-area-clique" className="pointer-events-auto absolute inset-x-[24%] bottom-0 top-[2%] z-10 cursor-pointer rounded-full" />
      <Personagem
        pose={pose}
        className="h-full w-full drop-shadow-md transition-transform duration-[var(--mov-rapido)] group-hover:-translate-y-0.5 motion-reduce:transform-none"
      />
    </button>
  );
});
