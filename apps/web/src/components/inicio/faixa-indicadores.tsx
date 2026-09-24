"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Destaque } from "@/lib/api-types";
import { descreverDestaque, linkPainel, textoVariacao } from "@/lib/destaques";
import { formatCompacto, formatNumero, formatPercentual } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarrasAnuais, Sparkline } from "./graficos-simples";

export function FaixaIndicadores({ itens }: { itens: Destaque[] }) {
  const [ativo, setAtivo] = useState(itens[0]?.chave ?? "");
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});
  const atual = itens.find((i) => i.chave === ativo) ?? itens[0];
  if (!atual) return null;

  const mover = (indice: number) => {
    const alvo = itens[(indice + itens.length) % itens.length]!;
    setAtivo(alvo.chave);
    botoes.current[alvo.chave]?.focus();
  };
  const aoTeclar = (e: KeyboardEvent, indice: number) => {
    const destino = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: itens.length - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    mover(destino);
  };

  const maior = atual.top[0]?.valor ?? 1;
  const unidade = atual.indicador.unidade.toLowerCase();
  const anos = atual.serie.map((p) => p.ano);

  return (
    <>
      <section aria-label="Indicadores de Rondônia" className="border-y border-b-line border-t-2 border-t-ink">
        <div className="container">
          <div role="tablist" aria-label="Escolha um indicador" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {itens.map((d, i) => {
              const selecionado = d.chave === atual.chave;
              return (
                <button
                  key={d.chave}
                  ref={(el) => {
                    botoes.current[d.chave] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${d.chave}`}
                  aria-selected={selecionado}
                  aria-controls="painel-indicador"
                  tabIndex={selecionado ? 0 : -1}
                  onClick={() => setAtivo(d.chave)}
                  onKeyDown={(e) => aoTeclar(e, i)}
                  className={cn(
                    "relative border-t border-line p-4 text-left transition-colors focus-visible:outline-offset-[-3px]",
                    "max-md:[&:nth-child(-n+2)]:border-t-0 md:max-xl:[&:nth-child(-n+3)]:border-t-0",
                    "xl:border-l xl:border-t-0 xl:first:border-l-0 xl:first:pl-0",
                    selecionado ? "bg-surface-alt" : "hover:bg-surface-alt/60",
                  )}
                >
                  {selecionado && <span aria-hidden="true" className="absolute inset-x-0 -top-0.5 h-1 bg-brand-light" />}
                  <span className="block text-xs font-semibold text-ink-muted">{d.rotulo}</span>
                  <span className="mt-2 block text-2xl font-semibold leading-tight tracking-tight tabular-nums lg:text-3xl">
                    {d.total === null ? "–" : formatCompacto(d.total)}
                  </span>
                  <span className="block text-sm text-ink-muted">{d.indicador.unidade.toLowerCase()}</span>
                  <span className="mt-3 block">
                    <Sparkline pontos={d.serie} negativo={(d.variacao_percentual ?? 0) < 0} />
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">{textoVariacao(d)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="painel-indicador" role="tabpanel" aria-labelledby={`tab-${atual.chave}`} className="bg-surface-alt py-9">
        <div className="container grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <div>
            <h2 className="text-xl font-semibold">
              {atual.rotulo}: {atual.indicador.nome.toLowerCase()}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Total de Rondônia, {anos[0]} a {atual.ano_referencia}, em {unidade}.
            </p>
            <div className="mt-5">
              <BarrasAnuais pontos={atual.serie} descricao={descreverDestaque(atual)} />
              <div className="mt-1.5 flex justify-between text-sm text-ink-muted">
                <span>{anos[0]}</span>
                <span>{atual.ano_referencia}</span>
              </div>
            </div>
            <table className="sr-only">
              <caption>
                {atual.rotulo}: valores por ano ({unidade})
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col">Valor</th>
                </tr>
              </thead>
              <tbody>
                {atual.serie.map((p) => (
                  <tr key={p.ano}>
                    <th scope="row">{p.ano}</th>
                    <td>{p.valor === null ? "sem dado" : formatNumero(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Municípios que lideram em {atual.ano_referencia}</h2>
            <ol className="mt-4 space-y-3">
              {atual.top.map((t, i) => (
                <li key={t.municipio.codigo_ibge} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 gap-y-1 text-[0.95rem]">
                  <span className="text-ink-muted tabular-nums">{i + 1}º</span>
                  <span>{t.municipio.nome}</span>
                  <span className="text-right font-semibold tabular-nums">
                    {t.valor === null ? "–" : formatCompacto(t.valor)}
                    <span className="sr-only"> {unidade}</span>
                    {t.percentual_total !== null && (
                      <span className="ml-2 hidden font-normal text-ink-muted sm:inline">{formatPercentual(t.percentual_total, 1)}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className="col-start-2 col-end-4 h-2 overflow-hidden rounded bg-[#d9e6de]">
                    <span className="block h-full bg-brand" style={{ width: `${((t.valor ?? 0) / maior) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ol>
            <Link href={linkPainel(atual)} className="mt-4 inline-block font-semibold text-brand underline underline-offset-4 hover:text-brand-dark">
              Ver os 52 municípios no painel
            </Link>
            <p className="mt-4 text-xs text-ink-muted">
              Fonte: {atual.meta.fonte}, tabela SIDRA {atual.meta.tabela_sidra}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
