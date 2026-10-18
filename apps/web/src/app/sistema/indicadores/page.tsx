import type { Metadata } from "next";
import { Indicadores } from "@/components/sistema/indicadores/indicadores";

export const metadata: Metadata = { title: "Indicadores" };

export default function IndicadoresPage() {
  return <Indicadores />;
}
