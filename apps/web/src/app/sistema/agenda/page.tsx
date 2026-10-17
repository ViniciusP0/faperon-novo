import type { Metadata } from "next";
import { Agenda } from "@/components/sistema/agenda/agenda";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return <Agenda />;
}
