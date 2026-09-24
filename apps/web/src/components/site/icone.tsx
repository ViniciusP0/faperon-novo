import { BarChart3, FileText, GitCompareArrows, Lightbulb, ShieldCheck, Trophy, type LucideIcon } from "lucide-react";
import type { NomeIcone } from "@/content/central";

const ICONES: Record<NomeIcone, LucideIcon> = {
  trophy: Trophy,
  chart: BarChart3,
  compare: GitCompareArrows,
  insight: Lightbulb,
  pdf: FileText,
  shield: ShieldCheck,
};

export function Icone({ nome, className }: { nome: NomeIcone; className?: string }) {
  const Componente = ICONES[nome];
  return <Componente aria-hidden="true" className={className} />;
}
