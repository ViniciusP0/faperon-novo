"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { recorteParams, type Filtros } from "@/lib/filters";
import { formatNumero, formatPercentual, formatValor } from "@/lib/format";
import { Carregando, ErroConsulta, NotaMetodologica } from "./comuns";

export function Ranking({ filtros }: { filtros: Filtros }) {
  const qs = recorteParams(filtros).toString();
  const { data, error, isPending, refetch } = useQuery({ queryKey: ["ranking", qs], queryFn: () => api.ranking(qs) });

  if (isPending) return <Carregando rotulo="ranking" />;
  if (error) return <ErroConsulta erro={error} onRetry={() => refetch()} />;

  const { indicador, itens, total_estadual, ano_referencia } = data;
  const maximo = Math.max(...itens.map((i) => i.valor ?? 0), 1);
  const mostraPercentual = itens.some((i) => i.percentual_total !== null);

  return (
    <section aria-labelledby="ranking-titulo">
      <h2 id="ranking-titulo" className="text-xl font-semibold">
        Ranking dos municípios — {data.produto.nome}, {indicador.nome.toLowerCase()} em {ano_referencia}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        O ranking usa sempre o ano final do período ({ano_referencia}). Unidade: {indicador.unidade.toLowerCase()}.
        {total_estadual !== null && (
          <>
            {" "}
            Total de Rondônia: <strong className="text-ink">{formatNumero(total_estadual)}</strong>.
          </>
        )}
      </p>

      <div tabIndex={0} role="region" aria-label="Tabela de ranking (role horizontalmente em telas pequenas)" className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">
            Municípios de Rondônia ordenados por {indicador.nome.toLowerCase()} de {data.produto.nome} em {ano_referencia}
          </caption>
          <thead className="bg-surface-alt text-left">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Posição
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Município
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Valor ({indicador.unidade.toLowerCase()})
              </th>
              {mostraPercentual && (
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  % do total estadual
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.municipio.codigo_ibge} className="border-t border-line/70 even:bg-surface-alt/50">
                <td className="px-4 py-2.5 tabular-nums">{item.posicao ?? "–"}</td>
                <th scope="row" className="px-4 py-2.5 text-left font-medium">
                  {item.municipio.nome}
                </th>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className="relative inline-flex min-w-28 justify-end">
                    {item.valor !== null && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 right-0 -z-0 rounded bg-brand-light/30"
                        style={{ width: `${Math.max((item.valor / maximo) * 100, 2)}%` }}
                      />
                    )}
                    <span className="relative px-1">
                      {formatValor(item.valor, item.status)}
                      {item.status === "sigiloso" && <span className="sr-only"> (sigiloso)</span>}
                      {item.status === "inexistente" && <span className="sr-only"> (sem valor publicado)</span>}
                    </span>
                  </span>
                </td>
                {mostraPercentual && <td className="px-4 py-2.5 text-right tabular-nums">{formatPercentual(item.percentual_total, 2)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NotaMetodologica meta={data.meta} />
    </section>
  );
}
