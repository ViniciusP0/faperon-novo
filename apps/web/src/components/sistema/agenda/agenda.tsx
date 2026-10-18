"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { itensDaAgenda, ROTULO_ORIGEM, ROTULO_TIPO_EVENTO } from "@/lib/sistema/agenda";
import { dataPorExtenso, formatarDataBR, gradeDoMes, nomeDoMes, somarDias } from "@/lib/sistema/datas";
import { novoId, useSistema } from "@/lib/sistema/estado";
import type { Evento } from "@/lib/sistema/tipos";
import { aplicarEvento } from "@/lib/sistema/voz";
import { cn } from "@/lib/utils";
import { Dialogo } from "../dialogo";
import { Segmentado } from "../segmentado";
import { AgendarPorVoz, AvisoVoz } from "../voz/agendar-por-voz";
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
// Na célula do mês cabem três; o resto aparece no painel do dia.
const NA_CELULA = 3;

// A origem é dita pela cor (com legenda) e por texto para leitor de tela, sem selo em cada evento.
const ORIGENS: Record<Evento["origem"], { rotulo: string; fundo: string; ponto: string }> = {
  pessoal: { rotulo: "Meus eventos", fundo: "bg-brand-soft", ponto: "bg-brand" },
  faperon: { rotulo: "FAPERON", fundo: "bg-warm", ponto: "bg-brand-lime" },
  frota: { rotulo: "Viagens da frota", fundo: "bg-steel-soft", ponto: "bg-steel" },
  espaco: { rotulo: "Espaços aprovados", fundo: "bg-surface-alt", ponto: "bg-brand-light" },
};

const origemFalada = (e: Evento) => ROTULO_ORIGEM[e.origem] ?? "Pessoal";

/** Celular: o painel do dia é onde se edita (as células só mostram pontos). Sem matchMedia (testes,
 *  servidor), vale o computador, em que a edição fica na célula do mês. */
function useCelular(): boolean {
  const [celular, setCelular] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const consulta = window.matchMedia("(max-width: 767px)");
    const mudar = () => setCelular(consulta.matches);
    mudar();
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);
  return celular;
}
const comInicialMaiuscula = (s: string) => s.replace(/^./, (l) => l.toUpperCase());

export function Agenda() {
  const { funcionario, hoje, eventos, institucionais, frota, pedidos, salvarEvento, excluirEvento } = useSistema();
  const [visao, setVisao] = useState<"mes" | "lista">("mes");
  const [mes, setMes] = useState(() => ({ ano: Number(hoje.slice(0, 4)), mes0: Number(hoje.slice(5, 7)) - 1 }));
  const [selecionado, setSelecionado] = useState(hoje);
  const [editando, setEditando] = useState<{ evento: Evento; novo: boolean; faltandoVoz?: string[] } | null>(null);
  const celular = useCelular();

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

  const eventoNovo = (data = hoje): Evento => ({
    id: novoId("evento"),
    titulo: "",
    data,
    inicio: "09:00",
    fim: "10:00",
    local: "",
    descricao: "",
    tipo: "reuniao",
    origem: "pessoal",
  });

  function novo(data = hoje) {
    setEditando({ novo: true, evento: eventoNovo(data) });
  }

  function andarMes(delta: number) {
    setMes(({ ano, mes0 }) => {
      const d = new Date(ano, mes0 + delta, 1);
      return { ano: d.getFullYear(), mes0: d.getMonth() };
    });
  }

  function irParaHoje() {
    setMes({ ano: Number(hoje.slice(0, 4)), mes0: Number(hoje.slice(5, 7)) - 1 });
    setSelecionado(hoje);
  }

  /** Evento clicável: o próprio abre a edição, a viagem leva à reserva; os demais só se leem. */
  function Item({ e, compacto, escuro }: { e: Evento; compacto?: boolean; escuro?: boolean }) {
    const conteudo = (
      <>
        <span aria-hidden="true" className={cn("mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full", ORIGENS[e.origem].ponto)} />
        <span className="min-w-0">
          <span className="font-semibold tabular-nums">{e.inicio}</span> <span className={cn(compacto && "line-clamp-2")}>{e.titulo}</span>
          <span className="sr-only">
            , <span>{origemFalada(e)}</span>
          </span>
          {!compacto && e.local && (
            <span className={cn("mt-0.5 flex items-center gap-1 text-xs", escuro ? "text-white/75" : "text-ink-muted")}>
              <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
              {e.local}
            </span>
          )}
        </span>
      </>
    );
    const classe = cn(
      "flex w-full gap-1.5 rounded-lg text-left transition duration-150 ease-out",
      compacto ? "px-1.5 py-1 text-xs" : "px-2.5 py-2 text-sm",
      escuro ? "bg-white/[0.08] text-white" : cn(ORIGENS[e.origem].fundo, "text-ink"),
    );
    const realce = escuro
      ? "hover:bg-white/[0.16] focus-visible:bg-white/[0.16]"
      : "hover:-translate-y-px hover:shadow-[0_6px_14px_-10px_rgb(0_70_58/0.45)] motion-reduce:hover:translate-y-0";
    if (e.origem === "pessoal") {
      return (
        <button type="button" className={cn(classe, realce)} onClick={() => setEditando({ evento: e, novo: false })} aria-label={`Editar ${e.titulo}, ${formatarDataBR(e.data)} às ${e.inicio}`}>
          {conteudo}
        </button>
      );
    }
    if (e.origem === "frota") {
      return (
        <Link href="/sistema/frotas?aba=reservas" className={cn(classe, realce)}>
          {conteudo}
        </Link>
      );
    }
    return <span className={classe}>{conteudo}</span>;
  }

  const grade = gradeDoMes(mes.ano, mes.mes0);
  const mesAtual = `${mes.ano}-${String(mes.mes0 + 1).padStart(2, "0")}`;
  const diasDaLista = Array.from({ length: DIAS_DA_LISTA }, (_, i) => somarDias(hoje, i)).filter((d) => porDia.has(d));
  const doDia = porDia.get(selecionado) ?? [];
  const proximos = Array.from({ length: 14 }, (_, i) => somarDias(selecionado, i + 1))
    .filter((d) => porDia.has(d))
    .slice(0, 4);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Minha agenda</h1>
          <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">Seus compromissos, os eventos da FAPERON, suas viagens e os espaços aprovados para você, num lugar só.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-tour="agenda-acoes">
          <Segmentado
            rotulo="Visão da agenda"
            valor={visao}
            aoMudar={setVisao}
            opcoes={[
              { valor: "mes", rotulo: "Mês" },
              { valor: "lista", rotulo: "Lista" },
            ]}
          />
          <AgendarPorVoz tipo="evento" aoInterpretar={(campos, faltando) => setEditando({ novo: true, evento: aplicarEvento(eventoNovo(), campos), faltandoVoz: faltando })} />
          <Button variant="vidro" onClick={() => novo()}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Novo evento
          </Button>
        </div>
      </div>

      {visao === "mes" ? (
        <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <section aria-labelledby="titulo-mes" className="min-w-0" data-tour="agenda-mes">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="titulo-mes" className="text-3xl tracking-[-0.03em] text-ink">
                <span className="font-semibold">{comInicialMaiuscula(nomeDoMes(mes.mes0))}</span> <span className="font-extralight">{mes.ano}</span>
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => andarMes(-1)} aria-label="Mês anterior">
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button variant="vidro-claro" size="sm" onClick={irParaHoje}>
                  Hoje
                </Button>
                <Button variant="ghost" size="sm" onClick={() => andarMes(1)} aria-label="Próximo mês">
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <table className="w-full table-fixed border-separate border-spacing-1">
              <caption className="sr-only">
                {comInicialMaiuscula(nomeDoMes(mes.mes0))} de {mes.ano}
              </caption>
              <thead>
                <tr>
                  {DIAS.map(([curto, longo], i) => (
                    <th key={curto} scope="col" className={cn("pb-1 text-center text-xs font-medium md:pl-2 md:text-left", i === 0 || i === 6 ? "text-brand-fg" : "text-ink-muted")}>
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
                    {semana.map((dia, i) => {
                      const doMes = dia.startsWith(mesAtual);
                      const lista = porDia.get(dia) ?? [];
                      const fimDeSemana = i === 0 || i === 6;
                      const escolhido = dia === selecionado;
                      return (
                        <td
                          key={dia}
                          className={cn(
                            "group h-14 rounded-lg p-1 align-top transition-colors duration-150 md:h-32 md:p-1.5",
                            doMes ? (fimDeSemana ? "bg-warm" : "bg-card") : "bg-transparent",
                            // contorno de 1 px é a única elevação da célula; hoje e o dia escolhido trocam por 2 px
                            dia === hoje ? "ring-2 ring-brand-lime" : escolhido ? "ring-2 ring-brand-light" : doMes && "ring-1 ring-inset ring-line",
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => setSelecionado(dia)}
                              aria-current={dia === hoje ? "date" : undefined}
                              aria-pressed={escolhido}
                              aria-label={`${comInicialMaiuscula(dataPorExtenso(dia))}${lista.length ? `, ${lista.length} evento(s)` : ""}`}
                              className={cn(
                                "mx-auto inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs tabular-nums transition md:mx-0",
                                dia === hoje ? "bg-brand font-semibold text-white" : doMes ? "font-medium text-ink hover:bg-brand-soft" : "text-ink-muted hover:bg-surface-alt",
                              )}
                            >
                              {Number(dia.slice(8))}
                            </button>
                            <button
                              type="button"
                              onClick={() => novo(dia)}
                              className="hidden rounded-md p-1 text-ink-muted opacity-0 transition hover:bg-brand-soft hover:text-brand-strong focus-visible:opacity-100 group-hover:opacity-100 md:block"
                              aria-label={`Novo evento em ${formatarDataBR(dia)}`}
                            >
                              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* no celular, só os pontos; o painel do dia mostra os eventos */}
                          {lista.length > 0 && (
                            <div aria-hidden="true" className="mt-1 flex justify-center gap-0.5 md:hidden">
                              {lista.slice(0, 4).map((e) => (
                                <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", ORIGENS[e.origem].ponto)} />
                              ))}
                            </div>
                          )}
                          <ul className="mt-1 hidden gap-1 md:grid">
                            {lista.slice(0, NA_CELULA).map((e) => (
                              <li key={e.id}>
                                <Item e={e} compacto />
                              </li>
                            ))}
                            {lista.length > NA_CELULA && (
                              <li>
                                <button type="button" onClick={() => setSelecionado(dia)} className="px-1.5 text-xs font-medium text-brand-fg hover:underline">
                                  mais {lista.length - NA_CELULA}
                                </button>
                              </li>
                            )}
                          </ul>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <ul aria-label="Legenda das cores" className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-muted">
              {Object.values(ORIGENS).map((o) => (
                <li key={o.rotulo} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", o.ponto)} />
                  {o.rotulo}
                </li>
              ))}
            </ul>
          </section>

          {/* abaixo de 1280 px o painel vai para baixo do mês, lado a lado com "Na sequência" */}
          <aside aria-labelledby="titulo-dia" className="grid min-w-0 items-start gap-6 md:grid-cols-2 xl:sticky xl:top-40 xl:block" data-tour="agenda-dia">
            <div className="rounded-2xl bg-brand-dark p-5 text-white shadow-[0_18px_40px_-24px_rgb(0_70_58/0.7)]">
              <h2 id="titulo-dia" className="text-xl font-semibold tracking-[-0.02em]">
                {comInicialMaiuscula(dataPorExtenso(selecionado))}
                {selecionado === hoje && <span className="ml-2 inline-block rounded-full bg-brand-lime px-2 py-0.5 align-middle text-xs font-semibold text-brand-dark">hoje</span>}
              </h2>
              {doDia.length === 0 ? (
                <p className="mt-4 text-sm text-white/80">Nada marcado. Dia livre para o campo ou para planejar a semana.</p>
              ) : (
                <ol className="mt-4 grid gap-2">
                  {doDia.map((e) => (
                    <li key={e.id}>
                      {/* no celular o painel é o lugar de editar; no computador, a célula do mês */}
                      {celular ? (
                        <Item e={e} escuro />
                      ) : (
                      <div className="text-sm">
                        <div className="flex gap-2 rounded-lg bg-white/[0.08] px-2.5 py-2">
                          <span aria-hidden="true" className={cn("mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full", ORIGENS[e.origem].ponto)} />
                          <span className="min-w-0">
                            <span className="font-semibold tabular-nums">
                              {e.inicio}–{e.fim}
                            </span>{" "}
                            {e.titulo}
                            <span className="sr-only">, {origemFalada(e)}</span>
                            {e.local && (
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-white/75">
                                <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
                                {e.local}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => novo(selecionado)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-lime px-3.5 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-lime-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                  Marcar neste dia
                </button>
                {selecionado !== hoje && (
                  <button type="button" onClick={irParaHoje} className="rounded-xl px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white">
                    Voltar para hoje
                  </button>
                )}
              </div>
            </div>

            {proximos.length > 0 && (
              <div className="min-w-0 xl:mt-6">
                <h3 className="text-sm font-semibold text-ink">Na sequência</h3>
                <ol className="mt-2 grid gap-3">
                  {proximos.map((dia) => (
                    <li key={dia} className="min-w-0">
                      <button type="button" onClick={() => setSelecionado(dia)} className="text-left text-xs font-medium text-brand-fg hover:underline">
                        {comInicialMaiuscula(dataPorExtenso(dia))}
                      </button>
                      <ul className="mt-1 grid gap-0.5 text-sm text-ink">
                        {porDia.get(dia)!.map((e) => (
                          <li key={e.id} className="flex min-w-0 gap-2" title={e.titulo}>
                            <span aria-hidden="true" className={cn("mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full", ORIGENS[e.origem].ponto)} />
                            <span className="min-w-0 truncate">
                              <span className="tabular-nums text-ink-muted">{e.inicio}</span> {e.titulo}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="mt-8 max-w-3xl">
          <h2 className="mb-4 text-xl font-semibold tracking-[-0.02em] text-ink">Próximos {DIAS_DA_LISTA} dias</h2>
          {diasDaLista.length === 0 && <p className="text-sm text-ink-muted">Nada marcado nos próximos {DIAS_DA_LISTA} dias. Use “Novo evento” para começar.</p>}
          <ol className="grid gap-5">
            {diasDaLista.map((dia) => (
              <li key={dia} className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <h3 className="text-sm font-semibold text-ink">
                  {comInicialMaiuscula(dataPorExtenso(dia))}
                  {dia === hoje && <span className="ml-2 rounded-full bg-brand-lime px-2 py-0.5 text-xs font-semibold text-brand-dark">hoje</span>}
                </h3>
                <ul className="grid gap-1.5">
                  {porDia.get(dia)!.map((e) => (
                    <li key={e.id}>
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
          {editando.faltandoVoz && <AvisoVoz faltando={editando.faltandoVoz} />}
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
