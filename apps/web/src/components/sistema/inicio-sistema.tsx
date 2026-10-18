"use client";

import { CalendarDays, Car, ChevronRight, DoorOpen, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { itensDaAgenda, ROTULO_ORIGEM } from "@/lib/sistema/agenda";
import { formatarDataBR, somarDias } from "@/lib/sistema/datas";
import { useSistema } from "@/lib/sistema/estado";

const PROXIMOS = 6;

export function InicioSistema() {
  const { funcionario, hoje, eventos, institucionais, frota, pedidos, atividades } = useSistema();
  const semana = somarDias(hoje, 7);
  const proximos = useMemo(
    () =>
      funcionario
        ? itensDaAgenda(funcionario.id, eventos, institucionais, frota.reservas, frota.veiculos, pedidos).filter((e) => e.data >= hoje && e.data <= semana)
        : [],
    [funcionario, eventos, institucionais, frota, pedidos, hoje, semana],
  );
  if (!funcionario) return null;

  const minhasReservas = frota.reservas.filter((r) => r.funcionarioId === funcionario.id && r.situacao === "agendada").length;
  const pendentes = pedidos.filter((p) => p.status === "pendente").length;
  const meusPendentes = pedidos.filter((p) => p.status === "pendente" && p.funcionarioId === funcionario.id).length;

  const atalhos = [
    { href: "/sistema/agenda", icone: CalendarDays, titulo: "Agenda", texto: `${proximos.length} evento(s) nos próximos 7 dias` },
    { href: "/sistema/frotas", icone: Car, titulo: "Frotas", texto: `${minhasReservas} reserva(s) sua(s) agendada(s)` },
    {
      href: "/sistema/espacos",
      icone: DoorOpen,
      titulo: "Espaços",
      texto: funcionario.gestorEspacos ? `${pendentes} pedido(s) na fila para avaliar` : `${meusPendentes} pedido(s) seu(s) aguardando`,
    },
    {
      href: "/sistema/atividades",
      icone: ClipboardList,
      titulo: "Atividades",
      texto: `${atividades.filter((a) => a.funcionarioId === funcionario.id && a.data >= somarDias(hoje, -6) && a.data <= hoje).length} atividade(s) sua(s) nos últimos 7 dias`,
    },
  ];

  return (
    <div>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">Olá, {funcionario.nome.split(" ")[0]}</h1>
      <p className="mt-1 text-ink-muted">
        {funcionario.area} · hoje é {formatarDataBR(hoje)}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="titulo-proximos">
          <h2 id="titulo-proximos" className="text-sm font-semibold text-ink">
            Pela frente, nos próximos 7 dias
          </h2>
          {proximos.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Nada marcado. Que tal usar a agenda para planejar a semana?</p>
          ) : (
            <ol className="mt-3 divide-y divide-line">
              {proximos.slice(0, PROXIMOS).map((e) => (
                <li key={e.id} className="flex items-baseline gap-4 py-3">
                  <span className="w-24 shrink-0 text-sm tabular-nums text-ink-muted">
                    {e.data === hoje ? "Hoje" : formatarDataBR(e.data).slice(0, 5)} · {e.inicio}
                  </span>
                  <span className="min-w-0 text-sm text-ink">
                    {e.titulo}
                    {ROTULO_ORIGEM[e.origem] && <Badge className="ml-2 px-2 py-0 text-[10px]">{ROTULO_ORIGEM[e.origem]}</Badge>}
                    {e.local && <span className="block text-xs text-ink-muted">{e.local}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {proximos.length > PROXIMOS && (
            <Link href="/sistema/agenda" className="mt-2 inline-block text-sm font-medium text-brand-fg underline-offset-4 hover:underline">
              Ver a agenda completa
            </Link>
          )}
        </section>

        <nav aria-labelledby="titulo-atalhos">
          <h2 id="titulo-atalhos" className="text-sm font-semibold text-ink">
            Atalhos
          </h2>
          <ul className="mt-3 grid gap-2">
            {atalhos.map(({ href, icone: Icone, titulo, texto }) => (
              <li key={href}>
                <Link href={href} className="vidro-claro group flex items-center gap-3 rounded-xl px-4 py-3 transition duration-150 ease-out">
                  <Icone aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-fg" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{titulo}</span>
                    <span className="block text-sm text-ink-muted">{texto}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand-fg motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
