"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { itensDaAgenda, ROTULO_ORIGEM, ROTULO_TIPO_EVENTO } from "@/lib/sistema/agenda";
import { formatarDataBR, gradeDoMes, nomeDoMes, somarDias } from "@/lib/sistema/datas";
import { novoId, useSistema } from "@/lib/sistema/estado";
import type { Evento } from "@/lib/sistema/tipos";
import { cn } from "@/lib/utils";
import { Dialogo } from "../dialogo";
import { FormularioEvento } from "./formulario-evento";

const DIAS = [
  ["Dom", "Domingo"],
  ["Seg", "Segunda-feira"],
  ["Ter", "Terça-feira"],
  ["Qua", "Quarta-feira"],
  ["Qui", "Quinta-feira"],
  ["Sex", "Sexta-feira"],
  ["Sáb", "Sábado"],
] as const;

const DIAS_DA_LISTA = 30;

const corDaOrigem: Record<Evento["origem"], string> = {
  pessoal: "border-l-brand bg-brand-soft",
  faperon: "border-l-brand-lime bg-warm",
  frota: "border-l-steel bg-steel-soft",
  espaco: "border-l-brand-light bg-surface-alt",
};

function Selo({ origem }: { origem: Evento["origem"] }) {
  const rotulo = ROTULO_ORIGEM[origem];
  return rotulo ? <Badge className="ml-1 px-2 py-0 text-[10px]">{rotulo}</Badge> : null;
}

export function Agenda() {
  const { funcionario, hoje, eventos, institucionais, frota, pedidos, salvarEvento, excluirEvento } = useSistema();
  const [visao, setVisao] = useState<"mes" | "lista">("mes");
  const [mes, setMes] = useState(() => ({ ano: Number(hoje.slice(0, 4)), mes0: Number(hoje.slice(5, 7)) - 1 }));
  const [editando, setEditando] = useState<{ evento: Evento; novo: boolean } | null>(null);

  const itens = useMemo(
    () => (funcionario ? itensDaAgenda(funcionario.id, eventos, institucionais, frota.reservas, frota.veiculos, pedidos) : []),
    [funcionario, eventos, institucionais, frota, pedidos],
  );
  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of itens) mapa.set(e.data, [...(mapa.get(e.data) ?? []), e]);
    return mapa;
  }, [itens]);

  if (!funcionario) return null;

  function novo(data = hoje) {
    setEditando({
      novo: true,
      evento: { id: novoId("evento"), titulo: "", data, inicio: "09:00", fim: "10:00", local: "", descricao: "", tipo: "reuniao", origem: "pessoal" },
    });
  }

  function andarMes(delta: number) {
    setMes(({ ano, mes0 }) => {
      const d = new Date(ano, mes0 + delta, 1);
      return { ano: d.getFullYear(), mes0: d.getMonth() };
    });
  }

  function Item({ e, compacto }: { e: Evento; compacto?: boolean }) {
    const conteudo = (
      <>
        <span className="font-medium">{e.inicio}</span> {e.titulo}
        <Selo origem={e.origem} />
        {!compacto && e.local && <span className="block text-xs text-ink-muted">{e.local}</span>}
      </>
    );
    const classe = cn("block w-full rounded-md border-l-4 px-2 py-1 text-left text-xs text-ink", corDaOrigem[e.origem]);
    if (e.origem === "pessoal") {
      return (
        <button type="button" className={cn(classe, "hover:brightness-95")} onClick={() => setEditando({ evento: e, novo: false })} aria-label={`Editar ${e.titulo}, ${formatarDataBR(e.data)} às ${e.inicio}`}>
          {conteudo}
        </button>
      );
    }
    if (e.origem === "frota") {
      return (
        <Link href="/sistema/frotas?aba=reservas" className={cn(classe, "hover:brightness-95")}>
          {conteudo}
        </Link>
      );
    }
    return <span className={classe}>{conteudo}</span>;
  }

  const grade = gradeDoMes(mes.ano, mes.mes0);
  const mesAtual = `${mes.ano}-${String(mes.mes0 + 1).padStart(2, "0")}`;
  const diasDaLista = Array.from({ length: DIAS_DA_LISTA }, (_, i) => somarDias(hoje, i)).filter((d) => porDia.has(d));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Minha agenda</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Visão da agenda" className="flex rounded-xl border border-line p-0.5">
            {(["mes", "lista"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={visao === v}
                onClick={() => setVisao(v)}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", visao === v ? "bg-brand text-white" : "text-ink-muted hover:text-ink")}
              >
                {v === "mes" ? "Mês" : "Lista"}
              </button>
            ))}
          </div>
          <Button onClick={() => novo()}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Novo evento
          </Button>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Seus eventos, os eventos da FAPERON, suas viagens com veículo da frota e os espaços aprovados para você.
      </p>

      {visao === "mes" ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => andarMes(-1)} aria-label="Mês anterior">
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMes({ ano: Number(hoje.slice(0, 4)), mes0: Number(hoje.slice(5, 7)) - 1 })}>
              Hoje
            </Button>
            <Button variant="ghost" size="sm" onClick={() => andarMes(1)} aria-label="Próximo mês">
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed border-collapse">
              <caption className="mb-2 text-left text-lg font-semibold text-ink">
                {nomeDoMes(mes.mes0).replace(/^./, (l) => l.toUpperCase())} de {mes.ano}
              </caption>
              <thead>
                <tr>
                  {DIAS.map(([curto, longo]) => (
                    <th key={curto} scope="col" className="pb-2 text-left text-xs font-semibold uppercase text-ink-muted">
                      <abbr title={longo} className="no-underline">
                        {curto}
                      </abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grade.map((semana) => (
                  <tr key={semana[0]}>
                    {semana.map((dia) => (
                      <td
                        key={dia}
                        className={cn(
                          "h-28 border border-line p-1 align-top",
                          !dia.startsWith(mesAtual) && "bg-surface-alt/60 text-ink-muted",
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            aria-current={dia === hoje ? "date" : undefined}
                            className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", dia === hoje && "bg-brand font-semibold text-white")}
                          >
                            {Number(dia.slice(8))}
                          </span>
                          <button type="button" onClick={() => novo(dia)} className="rounded px-1 text-xs text-ink-muted opacity-60 hover:bg-brand-soft hover:opacity-100" aria-label={`Novo evento em ${formatarDataBR(dia)}`}>
                            +
                          </button>
                        </div>
                        <ul className="grid gap-1">
                          {(porDia.get(dia) ?? []).map((e) => (
                            <li key={e.id}>
                              <Item e={e} compacto />
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-ink">Próximos {DIAS_DA_LISTA} dias</h2>
          {diasDaLista.length === 0 && <p className="text-sm text-ink-muted">Nada marcado nos próximos {DIAS_DA_LISTA} dias.</p>}
          <ol className="grid gap-4">
            {diasDaLista.map((dia) => (
              <li key={dia}>
                <h3 className="mb-1 text-sm font-semibold text-ink">
                  {formatarDataBR(dia)}
                  {dia === hoje && " (hoje)"}
                </h3>
                <ul className="grid gap-1.5">
                  {porDia.get(dia)!.map((e) => (
                    <li key={e.id} className="text-sm">
                      <Item e={e} />
                      <span className="sr-only">
                        {ROTULO_TIPO_EVENTO[e.tipo]}, de {e.inicio} a {e.fim}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}

      {editando && (
        <Dialogo titulo={editando.novo ? "Novo evento" : "Editar evento"} aoFechar={() => setEditando(null)}>
          <FormularioEvento
            inicial={editando.evento}
            novo={editando.novo}
            aoCancelar={() => setEditando(null)}
            aoExcluir={() => {
              excluirEvento(editando.evento.id);
              setEditando(null);
            }}
            aoSalvar={(evento) => {
              salvarEvento(evento);
              setEditando(null);
            }}
          />
        </Dialogo>
      )}
    </div>
  );
}
