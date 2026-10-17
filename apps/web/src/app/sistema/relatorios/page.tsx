import type { Metadata } from "next";
import { Relatorios } from "@/components/sistema/relatorios/relatorios";

export const metadata: Metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return <Relatorios />;
}
