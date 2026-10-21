"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import type { BoletimDia, BoletimNota, BoletimOrigem, BoletimStatusFonte } from "@/lib/api-types";
import { useSistema } from "@/lib/sistema/estado";
import { podeVerBoletim, rotuloDia } from "@/lib/sistema/boletim";
import { cn } from "@/lib/utils";
import { Segmentado } from "../segmentado";

type Origem = "todas" | BoletimOrigem;

const ORIGENS: { valor: Origem; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "estado", rotulo: "Estado · DOE-RO" },
  { valor: "uniao", rotulo: "União · DOU" },
];

const SELO_ORIGEM: Record<BoletimOrigem, { prefixo: string; sigla: string; classe: string }> = {
  estado: { prefixo: "Estado", sigla: "DOE-RO", classe: "bg-tipo-institucional-suave text-tipo-institucional" },
  uniao: { prefixo: "União", sigla: "DOU", classe: "bg-steel-soft text-steel" },
};

const ROTULO_FONTE = { dou: "DOU", doe: "DOE-RO" } as const;

/** "2026-10-20" -> "20/10/2026". */
function dataCompleta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const SELO = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold";

function SeloOrigem({ nota }: { nota: BoletimNota }) {
  const o = SELO_ORIGEM[nota.origem];
  return <span className={cn(SELO, o.classe)}>{`${o.prefixo} · ${nota.diario}`}</span>;
}

function SeloRondonia() {
  return <span className={cn(SELO, "bg-tipo-capacitacao-suave text-tipo-capacitacao")}>Rondônia</span>;
}

function LinkNota({ nota, texto }: { nota: BoletimNota; texto: string }) {
  return (
    <a
      href={nota.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-fg underline-offset-2 hover:underline"
    >
      {texto}
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function Destaque({ nota }: { nota: BoletimNota }) {
  const sigla = SELO_ORIGEM[nota.origem].sigla;
  return (
    <article aria-labelledby="boletim-destaque" className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-brand-soft px-5 py-2.5 text-[13px] font-semibold text-brand-strong">
        <span>Destaque do dia</span>
        <SeloOrigem nota={nota} />
        {nota.rondonia && <SeloRondonia />}
        <span className="font-normal text-ink-muted">{`${nota.orgao} · ${dataCompleta(nota.data)}`}</span>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <h2 id="boletim-destaque" className="text-xl font-semibold leading-snug text-ink">
          {nota.titulo}
        </h2>
        <p className="mt-2 max-w-[78ch] text-[15px] text-ink">{nota.resumo}</p>
        <div className="mt-3.5">
          <LinkNota nota={nota} texto={`Ver nota original no ${sigla}`} />
        </div>
      </div>
    </article>
  );
}

function ItemNota({ nota }: { nota: BoletimNota }) {
  return (
    <li className="grid gap-x-4 gap-y-1 rounded-xl border border-line bg-card px-4 py-4 transition-colors hover:border-brand-fg sm:grid-cols-[8.5rem_1fr]">
      <div className="flex flex-row flex-wrap items-center gap-2 text-xs text-ink-muted sm:flex-col sm:items-start">
        <SeloOrigem nota={nota} />
        <b className="text-[13px] font-semibold text-ink">{nota.orgao}</b>
        <span>{nota.data.slice(8, 10) + "/" + nota.data.slice(5, 7)}</span>
        {nota.rondonia && <SeloRondonia />}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold leading-snug text-ink">{nota.titulo}</h3>
        <p className="mt-1 text-sm text-ink-muted">
          {nota.resumo} <LinkNota nota={nota} texto="Ver nota" />
        </p>
      </div>
    </li>
  );
}

/** Fontes que não entregaram o diário do dia: o resto do boletim continua valendo. */
function AvisosDeFonte({ fontes }: { fontes: BoletimDia["fontes"] }) {
  const problemas = (Object.keys(ROTULO_FONTE) as (keyof typeof ROTULO_FONTE)[]).filter((f) => (["falha", "pendente"] as BoletimStatusFonte[]).includes(fontes[f].status));
  if (problemas.length === 0) return null;
  return (
    <Alert className="mt-4">
      <ul className="space-y-0.5">
        {problemas.map((f) => (
          <li key={f}>
            <strong>{ROTULO_FONTE[f]}:</strong> {fontes[f].erro}
          </li>
        ))}
      </ul>
    </Alert>
  );
}

function Conteudo({ dados, ehHoje, aoVerTodas, todasAbertas }: { dados: BoletimDia; ehHoje: boolean; aoVerTodas: () => void; todasAbertas: boolean }) {
  const { destaque, notas, total, fontes } = dados;
  const escondidas = total - (destaque ? 1 : 0) - notas.length;
  return (
    <>
      <AvisosDeFonte fontes={fontes} />
      {destaque ? (
        <div className="mt-5 space-y-7">
          <Destaque nota={destaque} />
          {notas.length > 0 && (
            <section aria-labelledby="boletim-outras">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id="boletim-outras" className="text-base font-semibold text-ink">
                  Outras notas
                </h2>
                <span className="text-[13px] text-ink-muted">{`${total} ${total === 1 ? "nota" : "notas"} no dia`}</span>
              </div>
              <ul aria-label="Notas do dia" className="grid gap-3">
                {notas.map((n) => (
                  <ItemNota key={n.id} nota={n} />
                ))}
              </ul>
              {!todasAbertas && escondidas > 0 && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={aoVerTodas}>{`Ver todas as ${total} notas`}</Button>
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-line bg-surface-alt px-5 py-8 text-center text-ink-muted">
          {ehHoje ? "Sem notas relevantes hoje" : "Sem notas relevantes neste dia"}
        </p>
      )}
    </>
  );
}

export function Boletim() {
  const { pronto, funcionario } = useSistema();
  const permitido = pronto && podeVerBoletim(funcionario);
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const [origem, setOrigem] = useState<Origem>("todas");
  const [todas, setTodas] = useState(false);

  const diasQ = useQuery({ queryKey: ["boletim", "dias"], queryFn: () => api.boletimDias(), enabled: permitido });
  const dias = diasQ.data?.dias ?? [];
  const dia = diaEscolhido ?? dias[0]?.dia ?? null;
  const diaQ = useQuery({
    queryKey: ["boletim", "dia", dia, origem, todas],
    queryFn: () => api.boletimDia(dia!, origem, todas),
    enabled: permitido && dia !== null,
  });

  if (!pronto) return <Skeleton className="h-64 w-full" />;
  if (!permitido) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">Boletim do Agro</h1>
        <p className="mt-2 text-sm text-ink-muted">O Boletim do Agro é restrito à coordenação e à gestão.</p>
      </div>
    );
  }

  const escolherDia = (d: string) => {
    setDiaEscolhido(d);
    setTodas(false);
  };
  const escolherOrigem = (o: Origem) => {
    setOrigem(o);
    setTodas(false);
  };

  const erro = diasQ.isError || diaQ.isError;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Boletim do Agro</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Notas do DOE-RO e do DOU sobre agronegócio, agricultura e agropecuária. Coleta automática, com resumo gerado por IA e sem revisão.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Dia">
        <span aria-hidden="true" className="mr-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Dia
        </span>
        {dias.map((d) => (
          <button
            key={d.dia}
            type="button"
            aria-pressed={d.dia === dia}
            onClick={() => escolherDia(d.dia)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
              d.dia === dia
                ? "border-brand bg-brand text-white"
                : d.total === 0
                  ? "border-line bg-surface-alt text-ink-muted hover:border-brand-fg"
                  : "border-line bg-card text-ink hover:border-brand-fg hover:text-brand-fg",
            )}
          >
            {rotuloDia(d.dia)}
            {d.total === 0 && <small className="text-xs opacity-85">sem notas</small>}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="mr-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Origem
        </span>
        <Segmentado rotulo="Origem" opcoes={ORIGENS} valor={origem} aoMudar={escolherOrigem} />
      </div>

      {erro ? (
        <Alert tone="erro" title="Não foi possível carregar o boletim." className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void diasQ.refetch();
              void diaQ.refetch();
            }}
          >
            Tentar de novo
          </Button>
        </Alert>
      ) : diaQ.data ? (
        <Conteudo dados={diaQ.data} ehHoje={diaQ.data.dia === dias[0]?.dia} todasAbertas={todas} aoVerTodas={() => setTodas(true)} />
      ) : (
        <Skeleton className="mt-5 h-64 w-full" />
      )}

      <p className="mt-7 rounded-xl border border-line bg-warm px-4 py-3 text-[13px] text-ink-muted">
        <strong className="text-ink">Como ler:</strong> resumos gerados por IA a partir do texto oficial, sem revisão humana. Confira sempre a nota original pelo link. Histórico de até 7 dias.
      </p>
    </div>
  );
}
