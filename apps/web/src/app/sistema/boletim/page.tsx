import type { Metadata } from "next";
import { Boletim } from "@/components/sistema/boletim/boletim";

export const metadata: Metadata = { title: "Boletim" };

export default function BoletimPage() {
  return <Boletim />;
}
