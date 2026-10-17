"use client";

import { CalendarDays, Car, DoorOpen } from "lucide-react";
import Link from "next/link";
import { useSistema } from "@/lib/sistema/estado";
import { somarDias } from "@/lib/sistema/datas";

export function InicioSistema() {
  const { funcionario, hoje, eventos, institucionais, frota, pedidos } = useSistema();
  if (!funcionario) return null;
  const semana = somarDias(hoje, 7);
  const proximos = [...eventos, ...institucionais].filter((e) => e.data >= hoje && e.data <= semana).length;
  const minhasReservas = frota.reservas.filter((r) => r.funcionarioId === funcionario.id && r.situacao === "agendada").length;
  const pendentes = pedidos.filter((p) => p.status === "pendente").length;
  const meusPendentes = pedidos.filter((p) => p.status === "pendente" && p.funcionarioId === funcionario.id).length;

  const cartoes = [
    { href: "/sistema/agenda", icone: CalendarDays, titulo: "Agenda", texto: `${proximos} evento(s) nos próximos 7 dias` },
    { href: "/sistema/frotas", icone: Car, titulo: "Frotas", texto: `${minhasReservas} reserva(s) sua(s) agendada(s)` },
    {
      href: "/sistema/espacos",
      icone: DoorOpen,
      titulo: "Espaços",
      texto: funcionario.gestorEspacos ? `${pendentes} pedido(s) na fila para avaliar` : `${meusPendentes} pedido(s) seu(s) aguardando`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Olá, {funcionario.nome.split(" ")[0]}</h1>
      <p className="mt-1 text-ink-muted">O que você quer fazer hoje?</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {cartoes.map(({ href, icone: Icone, titulo, texto }) => (
          <li key={href}>
            <Link href={href} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-card p-5 hover:border-brand-fg hover:bg-brand-soft">
              <Icone aria-hidden="true" className="h-6 w-6 text-brand-fg" />
              <span className="text-lg font-semibold text-ink">{titulo}</span>
              <span className="text-sm text-ink-muted">{texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
