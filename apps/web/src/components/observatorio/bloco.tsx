"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Carregando, ErroConsulta } from "@/components/painel/comuns";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import type { RespostaBase } from "@/lib/api-types";
import { formatDataHora } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resposta = RespostaBase<any, any, any, any>;

interface BlocoProps<R extends Resposta> {
  id: string;
  etiqueta: string;
  titulo: string;
  consulta: UseQueryResult<R>;
  filtros: ReactNode;
  tabela: (d: R) => ReactNode;
  linkPainel?: (d: R) => string | null;
  onPadrao: () => void;
  children: (d: R) => ReactNode;
}

export function fraseSigilosos(n: number): string {
  return n === 1
    ? "1 município com dado sigiloso fica fora dos totais."
    : `${n} municípios com dado sigiloso ficam fora dos totais.`;
}

export function Bloco<R extends Resposta>({ id, etiqueta, titulo, consulta, filtros, tabela, linkPainel, onPadrao, children }: BlocoProps<R>) {
  const [comoTabela, setComoTabela] = useState(false);
  const d = consulta.data;
  const painel = d && linkPainel ? linkPainel(d) : null;
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-32 border-t border-line pt-12">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-fg">{etiqueta}</p>
      <h2 id={`${id}-titulo`} className="mt-1 text-[1.75rem] font-semibold tracking-tight">{titulo}</h2>
      {filtros && <div className="mt-5 flex flex-wrap gap-4">{filtros}</div>}

      {consulta.isPending && <Carregando rotulo={titulo.toLowerCase()} />}
      {consulta.isError && consulta.error instanceof ApiError && consulta.error.status === 400 ? (
        <div role="alert" className="mt-6 rounded-md border border-line bg-surface-alt p-5">
          <p className="font-medium">{consulta.error.message}</p>
          <Button className="mt-3" onClick={onPadrao}>Voltar ao padrão</Button>
        </div>
      ) : consulta.isError ? (
        <ErroConsulta erro={consulta.error} onRetry={() => void consulta.refetch()} />
      ) : null}

      {d && (
        <>
          <p data-testid="manchete" className="mt-6 max-w-[70ch] text-lg font-medium leading-relaxed">{d.texto.manchete}</p>
          <div data-testid="conteudo-bloco" aria-busy={consulta.isPlaceholderData ? "true" : undefined} className={consulta.isPlaceholderData ? "mt-6 opacity-60 transition-opacity" : "mt-6"}>
            <div className="mb-2 flex justify-end">
              <Button variant="outline" size="sm" aria-pressed={comoTabela} onClick={() => setComoTabela((v) => !v)}>
                {comoTabela ? "Ver como gráfico" : "Ver como tabela"}
              </Button>
            </div>
            {comoTabela ? tabela(d) : children(d)}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-[3fr_2fr]">
            <div>
              <h3 id={`${id}-como-ler`} className="text-sm font-semibold uppercase tracking-wider text-ink-muted">Como ler</h3>
              <ul aria-labelledby={`${id}-como-ler`} className="mt-2 space-y-2 leading-relaxed text-ink-muted">
                {d.texto.como_ler.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            <aside aria-label="Fonte e qualidade do dado" className="rounded-md bg-surface-alt p-4 text-sm">
              {(d.qualidade.avisos.length > 0 || d.qualidade.municipios_sigilosos > 0) && (
                <ul aria-label="Avisos de qualidade do dado" className="space-y-1.5 text-ink-muted">
                  {d.qualidade.avisos.map((a, i) => <li key={i}>{a}</li>)}
                  {d.qualidade.municipios_sigilosos > 0 && <li>{fraseSigilosos(d.qualidade.municipios_sigilosos)}</li>}
                </ul>
              )}
              <p className="mt-3">
                Fonte:{" "}
                {d.meta.fontes.map((fte, i) => (
                  <span key={i}>
                    {i > 0 && "; "}
                    <a href={fte.url_fonte} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-fg underline">
                      {fte.fonte} (tabela {fte.tabela_sidra})
                    </a>
                  </span>
                ))}
                {d.meta.atualizado_em && <>. Atualizado em {formatDataHora(d.meta.atualizado_em)}.</>}
              </p>
              {painel && (
                <Link href={painel} className="mt-3 inline-flex items-center gap-1 font-medium text-brand-fg hover:underline">
                  Ver no Painel <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
